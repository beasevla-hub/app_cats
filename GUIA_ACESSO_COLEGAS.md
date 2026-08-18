# Acesso do app_cats pelos colegas

## Resumo de custos

O Cloudflare Tunnel pode ser usado sem pagar pelo túnel em si. O **Quick Tunnel** é gratuito, mas gera uma URL aleatória e temporária, indicada para testes e desenvolvimento. Para uso diário, o recomendado é um túnel nomeado com um hostname fixo. Nesse caso, pode existir custo apenas para registrar ou renovar um domínio próprio, caso a empresa ainda não tenha um.

O login dos usuários será feito pelo próprio app, com usuários individuais armazenados localmente em `backend/users.json`. As senhas não ficam em texto puro; o sistema salva hashes PBKDF2.

## 1. Atualizar o projeto

No computador que ficará ligado como servidor:

```powershell
cd C:\Users\win\Documents\app_cats
git pull origin main
```

## 2. Criar a configuração privada do backend

Copie o exemplo:

```powershell
cd C:\Users\win\Documents\app_cats\backend
Copy-Item .env.example .env
```

Abra `backend\.env` e ajuste pelo menos:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/acervos_db
SESSION_SECRET=cole-aqui-uma-chave-grande-e-aleatoria
ONEDRIVE_ROOT=C:\Users\win\THI Engenharia\THI - Documentos\Geral\THI 2026
```

Para gerar uma chave de sessão forte:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

O arquivo `.env` não deve ser enviado ao GitHub.

## 3. Criar os usuários

Ainda na pasta `backend`, execute:

```powershell
python manage_users.py add lucas Lucas
```

O sistema solicitará a senha duas vezes. Use uma senha real com pelo menos oito caracteres. O exemplo `123` é fraco e deve ser usado apenas em um teste local isolado, nunca em uma URL pública.

Para cadastrar outro colega:

```powershell
python manage_users.py add maria Maria
```

Para listar usuários:

```powershell
python manage_users.py list
```

Para remover um usuário:

```powershell
python manage_users.py remove lucas
```

## 4. Testar localmente

Execute `iniciar_acervo_tecnico.bat`. O frontend deverá abrir em:

```text
http://127.0.0.1:3717
```

A primeira tela será o login. Após entrar, as páginas de CATs, serviços e dashboard estarão protegidas.

## 5. Testar uma URL temporária sem abrir portas

Instale o `cloudflared` no Windows e, depois que o BAT estiver rodando, abra outro PowerShell:

```powershell
cloudflared tunnel --url http://127.0.0.1:3717
```

O terminal exibirá uma URL parecida com:

```text
https://algum-nome-aleatorio.trycloudflare.com
```

Envie essa URL para um colega apenas para testar. O Quick Tunnel é temporário e não deve ser usado como endereço permanente de produção.

## 6. URL fixa para uso diário

Para uma URL fixa, crie uma conta Cloudflare e use um domínio da empresa, por exemplo:

```text
https://acervo.suaempresa.com.br
```

Depois, no PowerShell:

```powershell
cloudflared tunnel login
cloudflared tunnel create acervo-tecnico
```

O comando exibirá um UUID. Crie o arquivo:

```text
C:\Users\win\.cloudflared\config.yml
```

Com este conteúdo, substituindo `UUID_DO_TUNEL` e o domínio:

```yaml
tunnel: UUID_DO_TUNEL
credentials-file: C:\Users\win\.cloudflared\UUID_DO_TUNEL.json

ingress:
  - hostname: acervo.suaempresa.com.br
    service: http://127.0.0.1:3717
  - service: http_status:404
```

Associe o DNS:

```powershell
cloudflared tunnel route dns acervo-tecnico acervo.suaempresa.com.br
```

Teste o túnel:

```powershell
cloudflared tunnel run acervo-tecnico
```

O colega acessará apenas:

```text
https://acervo.suaempresa.com.br
```

Não será necessário abrir porta de entrada no Firewall do Windows nem fazer port forwarding no roteador. O PC servidor precisa permanecer ligado, conectado e com o OneDrive sincronizado.

## 7. PDFs para colegas

Quando alguém usar `localhost`, o botão de PDF tenta abrir o arquivo no programa padrão do Windows no PC servidor. Quando alguém acessar pelo hostname HTTPS, o botão abre uma visualização HTTPS protegida do PDF pelo backend. O PDF continua na pasta do OneDrive; não é feito reupload nem cópia para o sistema.

## 8. Inicialização contínua

Para o primeiro teste, mantenha abertas as janelas do BAT e do `cloudflared tunnel run`. Depois que o fluxo estiver aprovado, o próximo passo será cadastrar backend, frontend e túnel no Agendador de Tarefas do Windows para iniciar automaticamente quando o PC ligar.

## Cuidados importantes

Não compartilhe a pasta `backend`, o arquivo `.env`, o arquivo `backend/users.json` ou o arquivo de credenciais do Cloudflare. Não use a senha `123` para acesso remoto. Se o computador servidor desligar, entrar em suspensão ou perder a sincronização do OneDrive, a URL continuará existindo, mas o app e os PDFs ficarão indisponíveis até o serviço voltar.
