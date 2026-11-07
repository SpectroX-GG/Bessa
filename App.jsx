import { useEffect, useMemo, useState } from 'react'
import {
  Snowflake, LayoutDashboard, CalendarDays, MapPin, ClipboardCheck,
  Users, LogOut, Plus, Search, Navigation, ExternalLink, CheckCircle2,
  Circle, Clock3, Phone, MapPinned, Trash2, X, Menu, Wrench
} from 'lucide-react'
import { isConfigured, supabase } from './supabase'

const starterMaterials = [
  'Tubulação de cobre', 'Isolamento térmico', 'Cabo PP / cabos elétricos',
  'Mangueira de dreno', 'Suporte da condensadora', 'Parafusos e buchas',
  'Fita PVC', 'Fita elastomérica', 'Porcas e conexões', 'Canaleta',
  'Disjuntor', 'Bomba de vácuo', 'Manifold', 'Flangeador', 'Cortador de tubos',
  'Chaves e ferramentas', 'Furadeira e brocas', 'Nível', 'Escada', 'EPIs'
]

const statusLabel = {
  scheduled: 'Agendada', in_progress: 'Em andamento',
  completed: 'Concluída', cancelled: 'Cancelada'
}

function dateBR(value) {
  if (!value) return 'Data não definida'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [installations, setInstallations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setInstallations([]); setLoading(false); return }
    loadData()
  }, [session])

  async function loadData() {
    setLoading(true); setError('')
    const [{ data: p, error: pe }, { data: rows, error: ie }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('installations').select('*, checklist_items(*)').order('scheduled_for', { ascending: true })
    ])
    if (pe) setError('Não foi possível carregar o perfil. Confira se o banco foi configurado.')
    else setProfile(p)
    if (ie) setError('Não foi possível carregar as instalações. Confira as políticas do banco.')
    else setInstallations(rows || [])
    setLoading(false)
  }

  async function signOut() { await supabase.auth.signOut() }

  const filtered = useMemo(() => installations.filter(item =>
    [item.client_name, item.address, item.city, item.notes].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  ), [installations, search])

  const counts = {
    today: installations.filter(x => x.scheduled_for === new Date().toLocaleDateString('en-CA') && x.status !== 'cancelled').length,
    open: installations.filter(x => ['scheduled', 'in_progress'].includes(x.status)).length,
    done: installations.filter(x => x.status === 'completed').length
  }

  if (!isConfigured) return <SetupScreen />
  if (!session) return <Login onLogin={setSession} />
  if (loading) return <div className="loading">Carregando Bessa Refrigeração...</div>

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Snowflake size={27}/></div>
          <div><strong>BESSA</strong><span>REFRIGERAÇÃO</span></div>
          <button className="mobile-close" onClick={() => setMobileNav(false)}><X/></button>
        </div>
        <div className="side-caption">MENU PRINCIPAL</div>
        <nav>
          <NavButton icon={<LayoutDashboard/>} label="Visão geral" active={page === 'dashboard'} onClick={() => {setPage('dashboard');setMobileNav(false)}}/>
          <NavButton icon={<CalendarDays/>} label="Instalações" active={page === 'installations'} onClick={() => {setPage('installations');setMobileNav(false)}}/>
          <NavButton icon={<MapPin/>} label="Mapa e rotas" active={page === 'map'} onClick={() => {setPage('map');setMobileNav(false)}}/>
          <NavButton icon={<ClipboardCheck/>} label="Materiais" active={page === 'materials'} onClick={() => {setPage('materials');setMobileNav(false)}}/>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">{(profile?.full_name || session.user.email || 'B').slice(0,1).toUpperCase()}</div>
            <div className="user-info"><strong>{profile?.full_name || 'Funcionário'}</strong><span>{profile?.role === 'admin' ? 'Administrador' : 'Equipe'}</span></div>
          </div>
          <button className="logout" onClick={signOut}><LogOut size={17}/> Sair do sistema</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMobileNav(true)}><Menu/></button>
          <div><span className="eyebrow">GESTÃO OPERACIONAL</span><h1>{pageTitle(page)}</h1></div>
          <div className="top-actions"><span className="online-dot"/> <span className="online-text">Conectado</span><div className="top-avatar">{(profile?.full_name || 'B').slice(0,1).toUpperCase()}</div></div>
        </header>
        {error && <div className="notice error">{error}</div>}
        {page === 'dashboard' && <Dashboard installations={installations} counts={counts} onNew={() => setShowForm(true)} onSelect={setSelected} setPage={setPage}/>}
        {page === 'installations' && <Installations rows={filtered} search={search} setSearch={setSearch} onNew={() => setShowForm(true)} onSelect={setSelected}/>}
        {page === 'map' && <MapPage rows={installations}/>}
        {page === 'materials' && <MaterialsPage rows={installations} onSelect={setSelected}/>}
      </main>

      {showForm && <InstallationForm onClose={() => setShowForm(false)} onSaved={() => {setShowForm(false);loadData()}}/>}
      {selected && <InstallationDetail item={selected} onClose={() => setSelected(null)} onChanged={() => {setSelected(null);loadData()}} isAdmin={profile?.role === 'admin'}/>}
    </div>
  )
}

function pageTitle(page) {
  return ({dashboard:'Visão geral', installations:'Instalações', map:'Mapa e rotas', materials:'Checklist de materiais'})[page]
}

function NavButton({icon,label,active,onClick}) {
  return <button className={`nav-button ${active?'active':''}`} onClick={onClick}>{icon}<span>{label}</span></button>
}

function SetupScreen() {
  return <div className="center-screen"><div className="setup-card">
    <div className="brand-icon large"><Snowflake size={32}/></div>
    <h1>Bessa Refrigeração</h1><p>O projeto está pronto para conectar ao banco de dados na nuvem.</p>
    <div className="setup-steps"><b>Próximos passos</b><ol><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL e a chave pública para o arquivo <code>.env</code>.</li><li>Crie o primeiro usuário e promova-o a administrador conforme o README.</li></ol></div>
    <p className="muted small">As credenciais ainda não foram configuradas. Nenhum dado será salvo até conectar o Supabase.</p>
  </div></div>
}

function Login() {
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    const {error} = await supabase.auth.signInWithPassword({email,password})
    if (error) setError('E-mail ou senha inválidos. Confira os dados e tente novamente.')
    setBusy(false)
  }
  return <div className="login-screen"><div className="login-card">
    <div className="brand centered"><div className="brand-icon"><Snowflake size={27}/></div><div><strong>BESSA</strong><span>REFRIGERAÇÃO</span></div></div>
    <h1>Acesse sua conta</h1><p>Entre para gerenciar as instalações da equipe.</p>
    <form onSubmit={submit}><label>E-mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/><label>Senha</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/>{error&&<div className="form-error">{error}</div>}<button className="primary full" disabled={busy}>{busy?'Entrando...':'Entrar no sistema'}</button></form>
    <span className="muted tiny">Acesso restrito à equipe Bessa Refrigeração.</span>
  </div></div>
}

function Dashboard({installations,counts,onNew,onSelect,setPage}) {
  const upcoming = installations.filter(x=>['scheduled','in_progress'].includes(x.status)).slice(0,5)
  return <div className="content">
    <div className="welcome-row"><div><h2>Bom trabalho!</h2><p>Acompanhe os serviços e organize sua equipe.</p></div><button className="primary" onClick={onNew}><Plus size={18}/> Nova instalação</button></div>
    <div className="stats-grid">
      <Stat icon={<CalendarDays/>} label="Instalações hoje" value={counts.today} tone="blue"/>
      <Stat icon={<Clock3/>} label="Serviços em aberto" value={counts.open} tone="orange"/>
      <Stat icon={<CheckCircle2/>} label="Concluídas" value={counts.done} tone="green"/>
    </div>
    <div className="section-heading"><div><h3>Próximas instalações</h3><p>Serviços agendados pela equipe</p></div><button className="text-button" onClick={()=>setPage('installations')}>Ver todas <ExternalLink size={15}/></button></div>
    {upcoming.length ? <div className="service-list">{upcoming.map(item=><ServiceCard key={item.id} item={item} onClick={()=>onSelect(item)}/>)}</div> : <EmptyState title="Nenhuma instalação agendada" text="Cadastre o próximo serviço para começar a organizar a agenda." action={onNew}/>}
  </div>
}

function Stat({icon,label,value,tone}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>
}

function Installations({rows,search,setSearch,onNew,onSelect}) {
  return <div className="content"><div className="toolbar"><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente ou endereço..."/></div><button className="primary" onClick={onNew}><Plus size={18}/> Nova instalação</button></div>
    {rows.length ? <div className="service-list">{rows.map(item=><ServiceCard key={item.id} item={item} onClick={()=>onSelect(item)}/>)}</div> : <EmptyState title="Nenhum serviço encontrado" text="Tente outra busca ou cadastre uma nova instalação." action={onNew}/>}
  </div>
}

function ServiceCard({item,onClick}) {
  const total = item.checklist_items?.length || 0
  const done = item.checklist_items?.filter(x=>x.checked).length || 0
  return <button className="service-card" onClick={onClick}>
    <div className="date-block"><strong>{new Date(`${item.scheduled_for}T12:00:00`).getDate()}</strong><span>{new Date(`${item.scheduled_for}T12:00:00`).toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span></div>
    <div className="service-main"><div className="service-title-row"><h4>{item.client_name}</h4><Status status={item.status}/></div><p><MapPin size={14}/>{[item.address,item.city].filter(Boolean).join(', ') || 'Endereço não informado'}</p><div className="service-meta"><span><Clock3 size={14}/>{item.scheduled_time || 'Horário não definido'}</span><span><ClipboardCheck size={14}/>{done}/{total} materiais</span></div></div>
    <ExternalLink className="card-arrow" size={18}/>
  </button>
}

function Status({status}) { return <span className={`status status-${status}`}>{statusLabel[status] || 'Agendada'}</span> }

function EmptyState({title,text,action}) {
  return <div className="empty-state"><div><CalendarDays size={27}/></div><h3>{title}</h3><p>{text}</p><button className="secondary" onClick={action}><Plus size={16}/> Cadastrar instalação</button></div>
}

function InstallationForm({onClose,onSaved}) {
  const [form,setForm] = useState({client_name:'',phone:'',scheduled_for:'',scheduled_time:'08:00',address:'',city:'Camocim - CE',notes:'',equipment:'',assigned_to:''})
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [geo,setGeo] = useState(null)
  const change = (key,value)=>setForm(old=>({...old,[key]:value}))
  function getLocation() {
    if (!navigator.geolocation) return setError('Este aparelho não oferece geolocalização.')
    navigator.geolocation.getCurrentPosition(pos=>setGeo({latitude:pos.coords.latitude,longitude:pos.coords.longitude}),()=>setError('Não foi possível obter a localização. Autorize o GPS e tente novamente.'),{enableHighAccuracy:true,timeout:12000})
  }
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('')
    const {data:{user}} = await supabase.auth.getUser()
    const {data:row,error:insertError} = await supabase.from('installations').insert({...form,latitude:geo?.latitude ?? null,longitude:geo?.longitude ?? null,created_by:user.id,status:'scheduled'}).select().single()
    if (insertError) {setError(insertError.message);setBusy(false);return}
    const items = starterMaterials.map(name=>({installation_id:row.id,name,checked:false}))
    const {error:itemsError} = await supabase.from('checklist_items').insert(items)
    if (itemsError) setError('Instalação criada, mas não foi possível gerar o checklist: '+itemsError.message)
    setBusy(false); onSaved()
  }
  return <Modal title="Nova instalação" onClose={onClose}><form className="form-grid" onSubmit={save}>
    <div className="field full-field"><label>Nome do cliente *</label><input required value={form.client_name} onChange={e=>change('client_name',e.target.value)} placeholder="Nome completo"/></div>
    <div className="field"><label>Telefone</label><input value={form.phone} onChange={e=>change('phone',e.target.value)} placeholder="(88) 99999-9999"/></div>
    <div className="field"><label>Equipamento</label><input value={form.equipment} onChange={e=>change('equipment',e.target.value)} placeholder="Ex.: Split 12.000 BTUs"/></div>
    <div className="field"><label>Data *</label><input type="date" required value={form.scheduled_for} onChange={e=>change('scheduled_for',e.target.value)}/></div>
    <div className="field"><label>Horário</label><input type="time" value={form.scheduled_time} onChange={e=>change('scheduled_time',e.target.value)}/></div>
    <div className="field full-field"><label>Endereço da instalação *</label><input required value={form.address} onChange={e=>change('address',e.target.value)} placeholder="Rua, número, bairro"/></div>
    <div className="field full-field"><label>Cidade / Estado</label><input value={form.city} onChange={e=>change('city',e.target.value)}/></div>
    <div className="field full-field"><button type="button" className="location-button" onClick={getLocation}><Navigation size={17}/>{geo?'Localização atual capturada':'Capturar minha localização atual'}</button>{geo&&<span className="muted tiny">Coordenadas registradas para este serviço.</span>}</div>
    <div className="field full-field"><label>Observações</label><textarea rows="3" value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="Detalhes do serviço, acesso ao local, materiais especiais..."/></div>
    {error&&<div className="form-error full-field">{error}</div>}
    <div className="form-footer full-field"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy?'Salvando...':'Salvar instalação'}</button></div>
  </form></Modal>
}

function MapPage({rows}) {
  const [position,setPosition] = useState(null)
  const [error,setError] = useState('')
  function locate() {
    setError('')
    navigator.geolocation?.getCurrentPosition(p=>setPosition({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setError('Localização não autorizada ou indisponível.'),{enableHighAccuracy:true,timeout:12000})
  }
  const active = rows.filter(x=>['scheduled','in_progress'].includes(x.status))
  return <div className="content"><div className="map-intro"><div><h2>Mapa e localização</h2><p>Consulte sua posição e abra a rota até o cliente.</p></div><button className="primary" onClick={locate}><Navigation size={17}/> Minha localização</button></div>
    {position&&<div className="notice success">Sua posição foi localizada: {position.lat.toFixed(5)}, {position.lng.toFixed(5)} <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${position.lat},${position.lng}`}>Abrir no mapa</a></div>}
    {error&&<div className="notice error">{error}</div>}
    <div className="map-placeholder"><MapPinned size={42}/><h3>Rotas das instalações</h3><p>Por segurança, o mapa abre no Google Maps quando você seleciona um endereço.</p><button className="secondary" onClick={locate}><Navigation size={16}/> Localizar meu aparelho</button></div>
    <div className="section-heading"><div><h3>Endereços agendados</h3><p>{active.length} serviço(s) em aberto</p></div></div>
    <div className="service-list">{active.map(item=><div className="route-row" key={item.id}><div className="route-pin"><MapPin/></div><div className="route-info"><strong>{item.client_name}</strong><span>{[item.address,item.city].filter(Boolean).join(', ')}</span><small>{dateBR(item.scheduled_for)} · {item.scheduled_time || 'Horário a definir'}</small></div><a className="icon-link" target="_blank" rel="noreferrer" href={mapsUrl(item)} aria-label="Abrir rota"><ExternalLink/></a></div>)}</div>
  </div>
}

function mapsUrl(item) {
  if (item.latitude && item.longitude) return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.address,item.city].filter(Boolean).join(', '))}`
}

function MaterialsPage({rows,onSelect}) {
  const [selected,setSelected] = useState(rows[0]?.id || '')
  useEffect(()=>{if(!rows.find(x=>x.id===selected)&&rows[0])setSelected(rows[0].id)},[rows])
  const item = rows.find(x=>x.id===selected)
  const list = item?.checklist_items || []
  return <div className="content"><div className="section-heading"><div><h2>Conferência de materiais</h2><p>Selecione uma instalação para conferir os itens.</p></div></div>
    {!rows.length ? <EmptyState title="Nenhuma instalação cadastrada" text="O checklist será criado automaticamente ao cadastrar um serviço." action={()=>{}}/> :
    <><div className="field material-select"><label>Instalação</label><select value={selected} onChange={e=>setSelected(e.target.value)}>{rows.map(x=><option key={x.id} value={x.id}>{x.client_name} — {dateBR(x.scheduled_for)}</option>)}</select></div>
    {item&&<div className="checklist-card"><div className="checklist-head"><div><h3>{item.client_name}</h3><p>{dateBR(item.scheduled_for)} · {item.equipment || 'Equipamento não informado'}</p></div><span className="progress-count">{list.filter(x=>x.checked).length}/{list.length}</span></div><div className="progress-track"><div style={{width:`${list.length?list.filter(x=>x.checked).length/list.length*100:0}%`}}/></div>
    {list.map(material=><MaterialRow key={material.id} material={material} onUpdate={async checked=>{await supabase.from('checklist_items').update({checked,checked_at:checked?new Date().toISOString():null}).eq('id',material.id); const updated={...material,checked}; item.checklist_items=list.map(x=>x.id===material.id?updated:x); onSelect({...item})}}/> )}
    </div></>}
    </>}
  </div>
}

function MaterialRow({material,onUpdate}) {
  return <button className={`material-row ${material.checked?'checked':''}`} onClick={()=>onUpdate(!material.checked)}>{material.checked?<CheckCircle2 className="check-on"/>:<Circle className="check-off"/>}<span>{material.name}</span>{material.checked&&<small>Conferido</small>}</button>
}

function InstallationDetail({item,onClose,onChanged,isAdmin}) {
  const [status,setStatus] = useState(item.status)
  const [busy,setBusy] = useState(false)
  async function updateStatus() {
    setBusy(true); const {error}=await supabase.from('installations').update({status}).eq('id',item.id)
    setBusy(false); if(!error)onChanged()
  }
  async function remove() {
    if(!isAdmin || !confirm('Excluir esta instalação e seu checklist?')) return
    await supabase.from('installations').delete().eq('id',item.id); onChanged()
  }
  const done=item.checklist_items?.filter(x=>x.checked).length||0
  const total=item.checklist_items?.length||0
  return <Modal title="Detalhes da instalação" onClose={onClose}><div className="detail-content">
    <div className="detail-title"><h2>{item.client_name}</h2><Status status={status}/></div>
    <DetailLine icon={<CalendarDays/>} label="Data e horário" value={`${dateBR(item.scheduled_for)} · ${item.scheduled_time||'Não definido'}`}/>
    <DetailLine icon={<MapPin/>} label="Endereço" value={[item.address,item.city].filter(Boolean).join(', ')||'Não informado'}/>
    <DetailLine icon={<Phone/>} label="Telefone" value={item.phone||'Não informado'}/>
    <DetailLine icon={<Wrench/>} label="Equipamento" value={item.equipment||'Não informado'}/>
    {item.notes&&<div className="detail-note"><b>Observações</b><p>{item.notes}</p></div>}
    <div className="detail-check"><b>Materiais conferidos</b><span>{done} de {total}</span></div>
    <div className="progress-track"><div style={{width:`${total?done/total*100:0}%`}}/></div>
    <a className="primary map-link" href={mapsUrl(item)} target="_blank" rel="noreferrer"><Navigation size={17}/> Abrir rota no Google Maps</a>
    <div className="field"><label>Atualizar situação</label><select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statusLabel).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></div>
    <div className="form-footer"><button className="secondary" onClick={onClose}>Fechar</button><button className="primary" onClick={updateStatus} disabled={busy}>{busy?'Salvando...':'Salvar situação'}</button></div>
    {isAdmin&&<button className="danger-button" onClick={remove}><Trash2 size={16}/> Excluir instalação</button>}
  </div></Modal>
}

function DetailLine({icon,label,value}) {
  return <div className="detail-line"><div>{icon}</div><section><small>{label}</small><span>{value}</span></section></div>
}

function Modal({title,onClose,children}) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-header"><h2>{title}</h2><button onClick={onClose}><X/></button></div>{children}</div></div>
}
