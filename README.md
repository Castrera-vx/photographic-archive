# Photographic Archive
Fase actual: servidor, base de datos, autenticacion y API publica (frontend y panel admin: siguientes fases).

Requiere Node 20.6 o superior. En PowerShell, dentro de la carpeta:

    npm install
    copy .env.example .env
    npm run create-admin     # pega la linea ADMIN_PASSWORD_HASH en .env
    npm test                 # prueba de humo
    npm start                # http://localhost:3000

Panel de administracion: http://localhost:3000/admin
