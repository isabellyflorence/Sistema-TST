# Hospital Esperança — SICC

Aplicação Angular para gestão de Segurança do Trabalho no ambiente hospitalar.

## Funcionalidades

- Login e controle de acesso por perfil (Administrador, RH e Técnico de Segurança do Trabalho).
- Dashboard com indicadores calculados a partir dos registros do sistema.
- Cadastro de colaboradores, EPIs, funções e usuários.
- Vínculo de categorias de EPI obrigatórias por função.
- Entrega, devolução e troca de EPIs com validação de função, validade e estoque.
- Entradas, saídas, níveis mínimos e alertas de validade no estoque.
- Treinamentos, participantes, vencimentos e emissão de certificados.
- Relatórios de recebimento, entrega, validade, estoque, conformidade, treinamento e auditoria.
- Exportação de relatórios para PDF (impressão) e Excel.
- Configuração de alertas e permissões, além de backup e restauração em JSON.
- Persistência local no navegador para uso sem backend durante a fase de protótipo.

## Executar o projeto

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

## Acessos de demonstração

| Perfil | Usuário | Senha |
| --- | --- | --- |
| Administrador | `admin@hospital.com` | `admin123` |
| RH | `rh@hospital.com` | `rh123` |
| Técnico de Segurança | `seguranca@hospital.com` | `sicc123` |

Os dados ficam no `localStorage` do navegador. Em **Configurações > Dados e backup** é possível exportar a base, importar um backup ou restaurar o cenário de demonstração.

## Build de produção

```bash
npm run build
```

Os arquivos compilados são gerados em `dist/hospital-esperanca-sicc`.

## Próxima etapa para produção

Substituir a persistência local por uma API com banco de dados, autenticação segura no servidor, trilha de auditoria identificada, backup institucional e assinatura eletrônica adequada às exigências da organização.
