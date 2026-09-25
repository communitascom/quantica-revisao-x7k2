/* Onde as observações do cliente são guardadas (Supabase, tabela "observacoes").
   Enquanto url e key estiverem vazios, a ferramenta roda em MODO DEMONSTRAÇÃO e avisa na tela que nada é enviado.
   A chave abaixo é a "anon" (pública por desenho): quem manda é a política de segurança da tabela
   (só inserir e ler; nunca alterar nem apagar). Ver tools/observacoes.sql. */
window.QA_OBS = { url: "", key: "", tabela: "observacoes" };
