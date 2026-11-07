# Bessa Refrigeração

Sistema web responsivo (PWA) para agenda de instalações, endereços, rotas e checklist de materiais.

## Requisitos
- Node.js 20 ou superior
- Projeto Supabase
- Navegador moderno; GPS exige HTTPS (localhost funciona durante desenvolvimento)

## 1. Instalação local

```bash
npm install
cp .env.example .env
```

Preencha `.env` com os dados do projeto Supabase:

```env
VITE_SUPABASE_URL=https://efltybugrwfpwiobfsor.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

Use a chave `sb_publishable_` no navegador. A chave antiga `anon` também funciona. **Nunca coloque `sb_secret_` ou `service_role` no frontend.**

## 2. Configurar o banco na nuvem
1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Cole e execute todo o conteúdo de `supabase/schema.sql`.
4. Em **Authentication > Providers**, mantenha Email habilitado.
5. Em **Authentication > URL Configuration**, configure a URL local e, depois, a URL publicada.

## 3. Criar administrador
1. Em **Authentication > Users**, crie o primeiro usuário com e-mail e senha.
2. Copie o UUID desse usuário.
3. No SQL Editor execute:

```sql
update public.profiles
set role = 'admin', full_name = 'Nome do administrador'
where id = 'UUID_DO_USUARIO';
```

4. Faça login no sistema.

## 4. Cadastrar funcionários
No Supabase, abra **Authentication > Users > Add user** e crie/invite cada funcionário. O trigger cria automaticamente um perfil com papel `employee`. Para que o funcionário defina a própria senha, use o fluxo de convite do Supabase e configure o SMTP para entrega confiável dos e-mails.

## 5. Executar
```bash
npm run dev
```
Abra o endereço local exibido pelo Vite.

## 6. Publicar
O projeto pode ser publicado em Vercel, Netlify ou outro host estático:
- Build command: `npm run build`
- Output directory: `dist`
- Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente do host.
- Configure no Supabase a URL pública do site.

## O que já está implementado
- Login por e-mail e senha.
- Perfis de administrador e funcionário no banco.
- Dashboard e contagem de serviços.
- Cadastro de instalação com cliente, telefone, data, horário, endereço, equipamento e observações.
- Captura opcional de GPS ao cadastrar e tela de localização atual.
- Links de rota/endereços pelo Google Maps.
- Checklist inicial de materiais por instalação, com gravação na nuvem.
- Atualização de status e exclusão administrativa.
- Layout adaptável a celular e desktop e configuração PWA.

## Observações importantes / próxima etapa
- A tela de equipe e convite de usuários pela própria interface ainda não foi implementada; nesta primeira versão, o administrador cria usuários pelo painel do Supabase.
- O mapa incorporado com pins dentro do site não está ligado a uma chave do Google Maps; por enquanto, endereços abrem no Google Maps em uma nova aba.
- O checklist inicial é uma lista-base editável no código. A próxima evolução pode incluir catálogo de materiais, quantidades, estoque e itens personalizados por instalação.
- Para produção, configure SMTP, política de senha, backups e domínio HTTPS.
