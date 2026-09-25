/* Quântica Analítica · protótipo de média fidelidade
   Observações do cliente: comentar direto no layout, com envio para um lugar central.
   Sem configuração (observacoes-config.js vazio) a ferramenta entra em MODO DEMONSTRAÇÃO e avisa,
   em todas as telas, que nada está sendo enviado. */
(function(){
  'use strict';
  var C=window.QA_OBS||{}, doc=document;
  var DEMO=!(C.url&&C.key), TAB=C.tabela||'observacoes';
  var K_DEMO='qa_obs_demo_v1', K_AUTOR='qa_obs_autor_v1';
  var MV=location.pathname.match(/\/((?:sem|com)-laboratorio)\/([^\/]+)$/), VER=MV?MV[1]:'';
  var PAG=MV?(MV[1]+'/'+MV[2]):(location.pathname.split('/').pop()||'index.html');
  var TIPOS=[['texto','Texto'],['visual','Visual'],['estrutura','Estrutura'],['duvida','Dúvida']];
  var STATUS={novo:'Nova',em_analise:'Em análise',resolvido:'Resolvida',descartado:'Descartada'};
  var MOVIMENTO=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

  function el(tag,cls,txt){ var e=doc.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function $(s,c){ return (c||doc).querySelector(s); }
  function armazena(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function le(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

  /* ------------------------------------------------------------ armazenamento */
  function hdr(){ return {'apikey':C.key,'Authorization':'Bearer '+C.key,'Content-Type':'application/json'}; }
  function demoLer(){ try{ return JSON.parse(le(K_DEMO)||'[]'); }catch(e){ return []; } }
  var API={
    demo:DEMO,
    lista:function(pagina){
      if(DEMO){ var a=demoLer(); return Promise.resolve(pagina?a.filter(function(o){return o.pagina===pagina;}):a); }
      var q=C.url+'/rest/v1/'+TAB+'?select=*&order=criado_em.asc&limit=1000'+(pagina?'&pagina=eq.'+encodeURIComponent(pagina):'');
      return fetch(q,{headers:hdr()}).then(function(r){ if(!r.ok) throw new Error('erro '+r.status); return r.json(); });
    },
    envia:function(o){
      if(DEMO){ var a=demoLer(); o.id=Date.now(); o.criado_em=new Date().toISOString(); o.status='novo'; a.push(o); armazena(K_DEMO,JSON.stringify(a)); return Promise.resolve(o); }
      var h=hdr(); h['Prefer']='return=representation';
      return fetch(C.url+'/rest/v1/'+TAB,{method:'POST',headers:h,body:JSON.stringify(o)}).then(function(r){
        if(!r.ok) return r.text().then(function(t){ throw new Error(t||('erro '+r.status)); });
        return r.json();
      }).then(function(a){ return a[0]; });
    }
  };
  window.QA_OBSAPI=API;

  function dataBr(iso){ try{ return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
  function tituloCurto(t){ return (t||'').replace(/^Quântica Analítica \| /,'').replace(/ \(média fidelidade\)$/,''); }
  function rotPagina(o){ var p=o.pagina||'', pre=p.indexOf('sem-laboratorio/')===0?'Sem laboratório · ':(p.indexOf('com-laboratorio/')===0?'Com laboratório · ':''); return pre+(tituloCurto(o.titulo)||p); }
  function tipoRot(t){ for(var i=0;i<TIPOS.length;i++){ if(TIPOS[i][0]===t) return TIPOS[i][1]; } return 'Geral'; }

  /* ------------------------------------------------------------ painel (página Observações) */
  if(doc.body.getAttribute('data-obs-admin')){ painel(); return; }

  /* ------------------------------------------------------------ overlay de comentários */
  var obs=[], modo=false, popAberto=null, pinsEl={};
  var raiz=el('div','qao'); var camada=el('div','qao-pins'); var hover=el('div','qao-hover'); hover.hidden=true;
  var barra=el('div','qao-barra','Clique no ponto que quer comentar. Os links ficam desligados neste modo. Esc para sair.'); barra.hidden=true; barra.setAttribute('role','status');
  var pill=el('div','qao-pill'); pill.setAttribute('role','group'); pill.setAttribute('aria-label','Observações sobre o layout');
  var bMain=el('button','qao-main','Comentar no layout'); bMain.type='button'; bMain.setAttribute('aria-pressed','false');
  var bLista=el('button','qao-lista','0'); bLista.type='button'; bLista.setAttribute('aria-label','Ver as observações desta página'); bLista.setAttribute('aria-expanded','false');
  pill.appendChild(bMain); pill.appendChild(bLista);
  var pop=el('div','qao-pop'); pop.hidden=true; pop.setAttribute('role','dialog'); pop.setAttribute('aria-modal','false');
  var painelLista=el('div','qao-painel'); painelLista.hidden=true;
  var toast=el('div','qao-toast'); toast.hidden=true; toast.setAttribute('role','status');
  raiz.appendChild(pill); raiz.appendChild(barra); raiz.appendChild(pop); raiz.appendChild(painelLista); raiz.appendChild(toast); raiz.appendChild(hover);
  doc.body.appendChild(raiz); doc.body.appendChild(camada);
  if(DEMO){ pill.classList.add('demo'); pill.title='Modo demonstração: as observações ficam só neste navegador e não são enviadas.'; var tg=el('span','qao-demo-tag','DEMO'); pill.insertBefore(tg,pill.firstChild); }

  function dentroFerramenta(n){ return n&&n.closest&&n.closest('.qao,.qao-pins'); }
  function esc(s){ return (window.CSS&&CSS.escape)?CSS.escape(s):String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }
  function seletor(e){
    var p=[]; while(e&&e.nodeType===1&&e!==doc.body&&p.length<10){
      if(e.id){ p.unshift('#'+esc(e.id)); return p.join(' > '); }
      var i=1, s=e; while((s=s.previousElementSibling)){ if(s.tagName===e.tagName) i++; }
      p.unshift(e.tagName.toLowerCase()+':nth-of-type('+i+')'); e=e.parentElement;
    } return 'body > '+p.join(' > ');
  }
  function trecho(e){ var t=(e.innerText||e.getAttribute('alt')||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim(); return t.slice(0,140); }

  function posicao(o){
    var e=null; try{ e=doc.querySelector(o.seletor); }catch(x){}
    if(!e) return null; var r=e.getBoundingClientRect(); if(!r.width&&!r.height) return null;
    return {x:r.left+scrollX+(o.fx==null?.5:o.fx)*r.width, y:r.top+scrollY+(o.fy==null?.5:o.fy)*r.height};
  }

  /* ------------------------------------------------------------ pins */
  function desenhaPins(){
    camada.textContent=''; pinsEl={}; var escondidos=0;
    obs.forEach(function(o,i){
      var p=posicao(o); if(!p){ escondidos++; return; }
      var b=el('button','qao-pin st-'+(o.status||'novo'),String(i+1)); b.type='button';
      b.style.left=p.x+'px'; b.style.top=p.y+'px';
      b.setAttribute('aria-label','Observação '+(i+1)+', de '+o.autor);
      b.addEventListener('click',function(ev){ ev.stopPropagation(); mostra(o,i); });
      camada.appendChild(b); pinsEl[o.id]=b;
    });
    bLista.textContent=String(obs.length);
  }
  function reposiciona(){ obs.forEach(function(o){ var b=pinsEl[o.id]; if(!b) return; var p=posicao(o); if(p){ b.style.left=p.x+'px'; b.style.top=p.y+'px'; } }); }
  var tmr=null; addEventListener('resize',function(){ clearTimeout(tmr); tmr=setTimeout(desenhaPins,150); });
  addEventListener('load',function(){ setTimeout(desenhaPins,300); });
  if(doc.fonts&&doc.fonts.ready) doc.fonts.ready.then(function(){ setTimeout(reposiciona,100); });
  var voltas=0, iv=setInterval(function(){ reposiciona(); if(++voltas>=6) clearInterval(iv); },1000);

  function aviso(txt){ toast.textContent=txt; toast.hidden=false; clearTimeout(aviso.t); aviso.t=setTimeout(function(){ toast.hidden=true; },3800); }

  /* ------------------------------------------------------------ modo comentar */
  function liga(){ modo=true; doc.body.classList.add('qao-on'); bMain.setAttribute('aria-pressed','true'); bMain.textContent='Sair do modo comentário'; barra.hidden=false; fechaLista(); }
  function desliga(){ modo=false; doc.body.classList.remove('qao-on'); bMain.setAttribute('aria-pressed','false'); bMain.textContent='Comentar no layout'; barra.hidden=true; hover.hidden=true; fechaPop(); }
  bMain.addEventListener('click',function(){ modo?desliga():liga(); });

  function alvoEm(x,y){ var t=doc.elementFromPoint(x,y); if(!t||dentroFerramenta(t)||t===doc.documentElement||t===doc.body) return null; return t; }
  doc.addEventListener('mousemove',function(e){
    if(!modo||popAberto==='novo'){ return; }
    var t=alvoEm(e.clientX,e.clientY); if(!t){ hover.hidden=true; return; }
    var r=t.getBoundingClientRect(); hover.style.left=r.left+'px'; hover.style.top=r.top+'px'; hover.style.width=r.width+'px'; hover.style.height=r.height+'px'; hover.hidden=false;
  },{passive:true});
  doc.addEventListener('click',function(e){
    if(!modo||dentroFerramenta(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    var t=alvoEm(e.clientX,e.clientY)||e.target; if(dentroFerramenta(t)) return;
    novo(t,e.clientX,e.clientY);
  },true);
  doc.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(popAberto){ fechaPop(); } else if(modo){ desliga(); } else if(!painelLista.hidden){ fechaLista(); } } });

  /* ------------------------------------------------------------ popover */
  function fechaPop(){ pop.hidden=true; pop.textContent=''; popAberto=null; hover.hidden=true; }
  function posiciona(x,y){
    var w=pop.offsetWidth||340, h=pop.offsetHeight||300;
    var l=Math.min(Math.max(12,x+14),innerWidth-w-12), t=Math.min(Math.max(12,y+14),innerHeight-h-12);
    pop.style.left=l+'px'; pop.style.top=t+'px';
  }
  function cabecalho(titulo,fecha){
    var h=el('div','qao-pop-h'); h.appendChild(el('strong',null,titulo));
    var x=el('button','qao-x','×'); x.type='button'; x.setAttribute('aria-label','Fechar'); x.addEventListener('click',fecha); h.appendChild(x); return h;
  }

  function novo(alvo,cx,cy){
    fechaPop(); popAberto='novo';
    var r=alvo.getBoundingClientRect();
    var ctx={seletor:seletor(alvo),trecho:trecho(alvo),fx:r.width?Math.min(1,Math.max(0,(cx-r.left)/r.width)):.5,fy:r.height?Math.min(1,Math.max(0,(cy-r.top)/r.height)):.5};
    hover.style.left=r.left+'px'; hover.style.top=r.top+'px'; hover.style.width=r.width+'px'; hover.style.height=r.height+'px'; hover.hidden=false;
    pop.appendChild(cabecalho('Nova observação',function(){ fechaPop(); }));
    var corpo=el('form','qao-form'); corpo.noValidate=true;
    if(ctx.trecho){ var s=el('p','qao-ctx'); s.appendChild(el('span',null,'Sobre: ')); s.appendChild(el('em',null,'“'+ctx.trecho+'”')); corpo.appendChild(s); }
    var l1=el('label',null,'Sua observação'); l1.setAttribute('for','qao-txt'); var ta=el('textarea'); ta.id='qao-txt'; ta.rows=4; ta.maxLength=2000; ta.placeholder='O que você mudaria, tiraria ou não entendeu aqui?';
    corpo.appendChild(l1); corpo.appendChild(ta);
    var fs=el('fieldset','qao-tipos'); fs.appendChild(el('legend',null,'Tipo'));
    TIPOS.forEach(function(t,i){ var lb=el('label','qao-tipo'); var rd=el('input'); rd.type='radio'; rd.name='qao-tipo'; rd.value=t[0]; if(i===0) rd.checked=true; lb.appendChild(rd); lb.appendChild(el('span',null,t[1])); fs.appendChild(lb); });
    corpo.appendChild(fs);
    var l2=el('label',null,'Seu nome'); l2.setAttribute('for','qao-nome'); var nm=el('input'); nm.id='qao-nome'; nm.type='text'; nm.maxLength=120; nm.autocomplete='name'; nm.value=le(K_AUTOR)||'';
    var l3=el('label',null,'E-mail (opcional)'); l3.setAttribute('for','qao-mail'); var ml=el('input'); ml.id='qao-mail'; ml.type='email'; ml.maxLength=200; ml.autocomplete='email'; ml.value=le(K_AUTOR+'_mail')||'';
    corpo.appendChild(l2); corpo.appendChild(nm); corpo.appendChild(l3); corpo.appendChild(ml);
    if(DEMO) corpo.appendChild(el('p','qao-demo','Modo demonstração: esta observação fica só neste navegador e NÃO chega à Communitas.'));
    var st=el('p','qao-status'); st.setAttribute('aria-live','polite'); corpo.appendChild(st);
    var ac=el('div','qao-acoes'); var env=el('button','qao-env','Enviar observação'); env.type='submit'; var can=el('button','qao-can','Cancelar'); can.type='button'; can.addEventListener('click',fechaPop); ac.appendChild(env); ac.appendChild(can); corpo.appendChild(ac);
    corpo.addEventListener('submit',function(ev){
      ev.preventDefault(); st.textContent='';
      var txt=ta.value.trim(), autor=nm.value.trim();
      if(!txt){ st.textContent='Escreva a observação.'; ta.focus(); return; }
      if(!autor){ st.textContent='Diga o seu nome.'; nm.focus(); return; }
      var tp=($('input[name="qao-tipo"]:checked',corpo)||{}).value||'geral';
      env.disabled=true; env.textContent='Enviando…';
      var payload={pagina:PAG,titulo:doc.title,url:location.href.split('#')[0].slice(0,300),seletor:ctx.seletor.slice(0,600),trecho:ctx.trecho,fx:ctx.fx,fy:ctx.fy,vw:innerWidth,vh:innerHeight,tipo:tp,comentario:txt,autor:autor,email:ml.value.trim()||null,agente:navigator.userAgent.slice(0,300)};
      API.envia(payload).then(function(o){
        armazena(K_AUTOR,autor); armazena(K_AUTOR+'_mail',ml.value.trim());
        obs.push(o); desenhaPins(); fechaPop(); aviso(DEMO?'Guardado só neste navegador (modo demonstração).':'Observação enviada. Obrigado!');
      }).catch(function(){
        env.disabled=false; env.textContent='Enviar observação';
        st.textContent='Não foi possível enviar agora. O texto continua aqui: tente de novo em instantes.';
      });
    });
    pop.appendChild(corpo); pop.hidden=false; posiciona(cx,cy); ta.focus();
  }

  function mostra(o,i){
    fechaPop(); popAberto='ver';
    pop.appendChild(cabecalho('Observação '+(i+1),fechaPop));
    var c=el('div','qao-ver');
    var meta=el('p','qao-meta'); meta.appendChild(el('strong',null,o.autor)); meta.appendChild(el('span',null,' · '+dataBr(o.criado_em)));
    c.appendChild(meta);
    var tags=el('p','qao-tags'); tags.appendChild(el('span','qao-tag',tipoRot(o.tipo))); tags.appendChild(el('span','qao-tag st-'+(o.status||'novo'),STATUS[o.status]||'Nova')); c.appendChild(tags);
    c.appendChild(el('p','qao-txt',o.comentario));
    if(o.trecho){ var s=el('p','qao-ctx'); s.appendChild(el('span',null,'Sobre: ')); s.appendChild(el('em',null,'“'+o.trecho+'”')); c.appendChild(s); }
    if(o.resposta){ var rp=el('p','qao-resp'); rp.appendChild(el('strong',null,'Resposta da Communitas: ')); rp.appendChild(doc.createTextNode(o.resposta)); c.appendChild(rp); }
    pop.appendChild(c); pop.hidden=false;
    var b=pinsEl[o.id], x=innerWidth/2, y=innerHeight/2;
    if(b){ var rr=b.getBoundingClientRect(); x=rr.left; y=rr.top; }
    posiciona(x,y);
  }

  /* ------------------------------------------------------------ lista da página */
  function fechaLista(){ painelLista.hidden=true; bLista.setAttribute('aria-expanded','false'); }
  function abreLista(){
    painelLista.textContent=''; painelLista.appendChild(cabecalho('Observações desta página',fechaLista));
    var c=el('div','qao-lista-c');
    if(!obs.length) c.appendChild(el('p','qao-vazio','Ainda não há observações nesta página. Use “Comentar no layout” para deixar a primeira.'));
    obs.forEach(function(o,i){
      var b=el('button','qao-item'); b.type='button';
      b.appendChild(el('span','qao-n',String(i+1)));
      var d=el('span','qao-item-t'); d.appendChild(el('strong',null,o.autor+' · '+tipoRot(o.tipo))); d.appendChild(el('span',null,o.comentario.length>110?o.comentario.slice(0,110)+'…':o.comentario)); b.appendChild(d);
      if(!pinsEl[o.id]) b.appendChild(el('em','qao-off','fora desta tela'));
      b.addEventListener('click',function(){ irPara(o,i); fechaLista(); });
      c.appendChild(b);
    });
    painelLista.appendChild(c);
    var a=el('a','qao-todas','Ver as observações de todas as páginas'); a.href=(VER?'../':'')+'Quantica_Site_Layout_Observacoes.html'; painelLista.appendChild(a);
    painelLista.hidden=false; bLista.setAttribute('aria-expanded','true');
  }
  bLista.addEventListener('click',function(){ painelLista.hidden?abreLista():fechaLista(); });
  function irPara(o,i){
    var b=pinsEl[o.id]; if(!b){ aviso('Esta observação foi feita em outro tamanho de tela.'); return; }
    var y=parseFloat(b.style.top)-innerHeight/2; window.scrollTo({top:Math.max(0,y),behavior:MOVIMENTO?'smooth':'auto'});
    setTimeout(function(){ mostra(o,i); },MOVIMENTO?450:0);
  }

  /* ------------------------------------------------------------ carga inicial */
  API.lista(PAG).then(function(l){
    obs=l||[]; desenhaPins();
    var alvo=new URLSearchParams(location.search).get('obs');
    if(alvo){ for(var i=0;i<obs.length;i++){ if(String(obs[i].id)===alvo){ irPara(obs[i],i); break; } } }
  }).catch(function(){ pill.classList.add('sem-rede'); pill.title='Não foi possível carregar as observações agora. Você ainda pode comentar.'; });

  /* ------------------------------------------------------------ painel (página Observações) */
  function painel(){
    var dados=[], raizP=$('#obs-painel');
    var resumo=$('#obs-resumo'), lista=$('#obs-lista');
    var fP=$('#f-pagina'), fT=$('#f-tipo'), fS=$('#f-status'), fQ=$('#f-busca');
    if(API.demo){ var av=el('p','obs-demo','Modo demonstração: aparece só o que este navegador guardou. Nada disto chegou à Communitas.'); raizP.insertBefore(av,raizP.firstChild); }
    function filtrados(){
      var p=fP.value, t=fT.value, s=fS.value, q=fQ.value.trim().toLowerCase();
      return dados.filter(function(o){
        return (!p||o.pagina===p)&&(!t||o.tipo===t)&&(!s||(o.status||'novo')===s)&&(!q||(o.comentario+' '+o.autor+' '+(o.trecho||'')).toLowerCase().indexOf(q)>-1);
      });
    }
    function render(){
      var f=filtrados(); lista.textContent='';
      var cont={novo:0,em_analise:0,resolvido:0,descartado:0}; dados.forEach(function(o){ cont[o.status||'novo']=(cont[o.status||'novo']||0)+1; });
      resumo.textContent=dados.length+(dados.length===1?' observação':' observações')+' no total: '+cont.novo+' novas, '+cont.em_analise+' em análise, '+cont.resolvido+' resolvidas, '+cont.descartado+' descartadas. Mostrando '+f.length+'.';
      if(!f.length){ lista.appendChild(el('p','obs-vazio','Nenhuma observação com esses filtros.')); return; }
      var grupos={}, ordem=[]; f.forEach(function(o){ if(!grupos[o.pagina]){ grupos[o.pagina]=[]; ordem.push(o.pagina); } grupos[o.pagina].push(o); });
      ordem.forEach(function(pg){
        var g=el('section','obs-grupo'); var h=el('h2',null,rotPagina(grupos[pg][0])); g.appendChild(h);
        grupos[pg].forEach(function(o){
          var c=el('article','obs-card');
          var top=el('p','obs-topo'); top.appendChild(el('span','obs-tag',tipoRot(o.tipo))); top.appendChild(el('span','obs-tag st-'+(o.status||'novo'),STATUS[o.status]||'Nova')); top.appendChild(el('span','obs-quem',o.autor+' · '+dataBr(o.criado_em)+' · tela de '+(o.vw||'?')+' px')); c.appendChild(top);
          c.appendChild(el('p','obs-txt',o.comentario));
          if(o.trecho){ var s=el('p','obs-ctx'); s.appendChild(el('span',null,'Sobre: ')); s.appendChild(el('em',null,'“'+o.trecho+'”')); c.appendChild(s); }
          if(o.resposta){ var rp=el('p','obs-resp'); rp.appendChild(el('strong',null,'Resposta: ')); rp.appendChild(doc.createTextNode(o.resposta)); c.appendChild(rp); }
          var a=el('a','obs-abrir','Abrir no layout'); a.href=o.pagina+'?obs='+encodeURIComponent(o.id); c.appendChild(a);
          g.appendChild(c);
        });
        lista.appendChild(g);
      });
    }
    function monta(){
      var ps={}; dados.forEach(function(o){ ps[o.pagina]=rotPagina(o); });
      Object.keys(ps).sort().forEach(function(k){ var op=el('option',null,ps[k]); op.value=k; fP.appendChild(op); });
      render();
    }
    [fP,fT,fS].forEach(function(x){ x.addEventListener('change',render); }); fQ.addEventListener('input',render);
    function texto(){
      return filtrados().map(function(o){ return '- ['+tituloCurto(o.titulo)+'] '+o.autor+' ('+tipoRot(o.tipo)+', '+(STATUS[o.status]||'Nova')+'): '+o.comentario+(o.trecho?' | Sobre: '+o.trecho:'')+' | '+o.pagina; }).join('\n');
    }
    $('#obs-copiar').addEventListener('click',function(){
      var t=texto(), b=this; function ok(){ b.textContent='Copiado'; setTimeout(function(){ b.textContent='Copiar como texto'; },1800); }
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok); } else { var ta=el('textarea'); ta.value=t; doc.body.appendChild(ta); ta.select(); try{ doc.execCommand('copy'); ok(); }catch(e){} ta.remove(); }
    });
    $('#obs-csv').addEventListener('click',function(){
      var cab=['id','criado_em','pagina','tipo','status','autor','email','comentario','trecho','seletor','tela','resposta'];
      var lin=filtrados().map(function(o){ return [o.id,o.criado_em,o.pagina,o.tipo,o.status,o.autor,o.email||'',o.comentario,o.trecho||'',o.seletor||'',o.vw||'',o.resposta||''].map(function(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; }).join(','); });
      var blob=new Blob(['﻿'+cab.join(',')+'\n'+lin.join('\n')],{type:'text/csv;charset=utf-8'}); var a=el('a'); a.href=URL.createObjectURL(blob); a.download='observacoes-site-quantica.csv'; doc.body.appendChild(a); a.click(); a.remove();
    });
    API.lista(null).then(function(l){ dados=(l||[]).slice().sort(function(a,b){ return String(b.criado_em).localeCompare(String(a.criado_em)); }); monta(); })
      .catch(function(e){ resumo.textContent='Não foi possível carregar as observações agora ('+e.message+').'; });
  }
})();
