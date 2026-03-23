# Backend (Django API)

Configuração básica de API Django para o projeto.

## Rodar localmente

1. Criar e ativar ambiente virtual
2. Instalar dependências:
   - `pip install -r requirements.txt`
3. (Opcional) copiar `.env.example` para `.env` e ajustar valores
4. Executar migrações:
   - `python manage.py makemigrations accounts`
   - `python manage.py migrate`
5. Subir servidor:
   - `python manage.py runserver`

## Rotas iniciais

- `GET /api/health/`
- `GET /admin/`
- CRUD clientes:
  - `GET /api/clientes/`
  - `POST /api/clientes/`
  - `GET /api/clientes/{id}/`
  - `PUT/PATCH /api/clientes/{id}/`
  - `DELETE /api/clientes/{id}/`

## Login com Google (backend Django)

Após instalar dependências e rodar migrações, o backend expõe:

- Início do login Google: `GET /auth/login/google-oauth2/`
- Callback do Google: `GET /auth/complete/google-oauth2/`

### Google Cloud - Redirect URI (desenvolvimento local)

Cadastre esta URI no Google OAuth:

- `http://localhost:8000/auth/complete/google-oauth2/`

### Variáveis de ambiente necessárias

- `GOOGLE_OAUTH2_KEY`
- `GOOGLE_OAUTH2_SECRET`
- `FRONTEND_URL` (ex.: `http://localhost:3000`)

## Modelo de usuário (mesma tabela de users)

O projeto usa `CustomUser` (`AUTH_USER_MODEL`) com tabela `users` e campos:
- `email` (único)
- `full_name`
- `cpf` (único)
- `birth_date`
- `phone` (opcional)
- `user_type` (`CLIENTE` / `ADMIN`)

No CRUD `/api/clientes/`, a senha é opcional. Se não for enviada, o usuário cliente é criado com senha desabilitada (`set_unusable_password`).
