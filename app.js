const KEY='lojaPedras.v4';
const FORMAS=['Dinheiro','Pix','Cartão de débito','Transferência','Cartão de crédito','Boleto','A prazo (fiado)'];
const IMEDIATAS=['Dinheiro','Pix','Cartão de débito','Transferência'];
let db={produtos:[],compras:[],vendas:[],despesas:[],clientes:[],reservas:[],perdas:[],fornecedores:[],meta:5000};

let editProdId=null, editCompraId=null, editVendaId=null, editDespesaId=null, editClienteId=null, editReservaId=null, editPerdaId=null, editFornecedorId=null;

try{
  const s=localStorage.getItem(KEY) || localStorage.getItem('lojaPedras.v3') || localStorage.getItem('lojaPedras.v2');
  if(s){
    db=JSON.parse(s);
    if(!db.despesas) db.despesas=[];
    if(!db.clientes) db.clientes=[];
    if(!db.reservas) db.reservas=[];
    if(!db.perdas) db.perdas=[];
    if(!db.fornecedores) db.fornecedores=[];
    if(!db.meta) db.meta=5000;
  }
}catch(e){}

const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){alert('Não foi possível salvar neste navegador.')}};
const $=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const brl=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dbr=d=>d?d.split('-').reverse().join('/'):'';
const fmtISO=t=>t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
const hoje=()=>fmtISO(new Date());
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nomeProd=id=>(db.produtos.find(p=>p.id===id)||{nome:'(removido)'}).nome;
const mini=id=>{const p=db.produtos.find(x=>x.id===id);return p&&p.foto?`<img class="mini" src="${p.foto}" alt="">`:''};
const soma=(l,f)=>l.reduce((a,x)=>a+f(x),0);

$('btnToggleSidebar').onclick = () => {
  const sidebar = $('sidebar');
  sidebar.classList.toggle('recolhido');
  if(sidebar.classList.contains('recolhido')){
    $('btnToggleSidebar').textContent = '➡';
  } else {
    $('btnToggleSidebar').textContent = '⬅ Recolher';
  }
};

function addMeses(d,n){
  const [y,m,dia]=d.split('-').map(Number);
  const t=new Date(y,m-1+n,1),ult=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  t.setDate(Math.min(dia,ult));return fmtISO(t);
}
function gerarParcelas(total,n,venc1,imediato,data){
  const base=Math.floor(total/n*100)/100;let acc=0;
  return Array.from({length:n},(_,i)=>{
    const v=i<n-1?base:Math.round((total-acc)*100)/100;acc+=v;
    return{n:i+1,venc:imediato?data:addMeses(venc1,i),valor:v,pago:imediato,dataPag:imediato?data:''};
  });
}

db.compras.forEach(x=>{if(!x.parc){x.forma='Dinheiro';x.parc=gerarParcelas(x.qtd*x.custo,1,x.data,true,x.data)}});
db.vendas.forEach(x=>{if(!x.parc){x.forma='Dinheiro';x.parc=gerarParcelas(x.qtd*x.preco,1,x.data,true,x.data)}});

document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));
  render();
});

const noPeriodo=(l,de,ate)=>l.filter(x=>(!de||x.data>=de)&&(!ate||x.data<=ate));
function custoMedio(id){
  const c=db.compras.filter(x=>x.prodId===id),q=soma(c,x=>x.qtd);
  return q?soma(c,x=>x.qtd*x.custo)/q:0;
}

function resumo(de,ate){
  const cp=noPeriodo(db.compras,de,ate),vd=noPeriodo(db.vendas,de,ate),pd=noPeriodo(db.perdas,de,ate);
  return db.produtos.map(p=>{
    const c=cp.filter(x=>x.prodId===p.id),v=vd.filter(x=>x.prodId===p.id),per=pd.filter(x=>x.prodId===p.id),cm=custoMedio(p.id);
    const qC=soma(c,x=>x.qtd),gasto=soma(c,x=>x.qtd*x.custo),qV=soma(v,x=>x.qtd),qP=soma(per,x=>x.qtd);
    const receitaBruta=soma(v,x=>x.qtd*x.preco);
    const taxasTotal=soma(v,x=>(x.qtd*x.preco)*((x.taxa||0)/100));
    const receitaLiquida=receitaBruta-taxasTotal;
    const custoPerdas=qP*cm;
    const lucro=receitaLiquida-(qV*cm)-custoPerdas;
    const estoque=soma(db.compras.filter(x=>x.prodId===p.id),x=>x.qtd)-soma(db.vendas.filter(x=>x.prodId===p.id),x=>x.qtd)-soma(db.perdas.filter(x=>x.prodId===p.id),x=>x.qtd);
    const min = p.minimo !== undefined ? +p.minimo : 2;
    return{p,qC,gasto,qV,qP,custoPerdas,receitaBruta,receitaLiquida,taxasTotal,lucro,cm,estoque,min,unica:!!p.unica,margem:receitaLiquida?lucro/receitaLiquida*100:0};
  });
}

function listaParc(){
  const L=[];
  db.vendas.forEach(r=>r.parc.forEach((p,i)=>L.push({tipo:'v',r,p,i})));
  db.compras.forEach(r=>r.parc.forEach((p,i)=>L.push({tipo:'c',r,p,i})));
  return L;
}
const textoPag=r=>r.forma+(r.parc.length>1?` ${r.parc.length}x`:'');

function tabela(cols,rows,vazio){
  if(!rows.length)return `<div class="vazio">${vazio}</div>`;
  return `<table><thead><tr>${cols.map(c=>`<th class="${c[1]||''}">${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function renderProdutos(){
  const r=resumo('','');
  $('tProd').innerHTML=tabela([['Foto (Cole Ctrl+V)'],['Produto'],['Tipo'],['Status'],['Preço Física','n'],['Preço Online','n'],['Preço Médio Custo','n'],['Estoque','n'],['Ações']],
    r.map(x=>{
      let statusBadge = '';
      if(x.unica) {
        statusBadge = x.estoque <= 0 ? '<span class="badge badge-esgotado">Vendido</span>' : '<span class="badge badge-unica">Peça Única</span>';
      } else if(x.estoque <= 0) {
        statusBadge = '<span class="badge badge-esgotado">Esgotado</span>';
      } else if(x.estoque <= x.min) {
        statusBadge = '<span class="badge badge-baixo">Estoque Baixo</span>';
      }

      return `<tr>
        <td>
          <label style="cursor:pointer" tabindex="0" class="lbl-foto" data-id="${x.p.id}">
            ${x.p.foto?`<img class="thumb" src="${x.p.foto}" alt="${esc(x.p.nome)}">`:'<span class="sem">+ foto</span>'}
            <input type="file" accept="image/*" hidden data-foto="${x.p.id}">
          </label>
        </td>
        <td>${esc(x.p.nome)}</td>
        <td>${esc(x.p.tipo)}</td>
        <td>${statusBadge}</td>
        <td class="n">${x.p.preco?brl(x.p.preco):'—'}</td>
        <td class="n">${x.p.precoOnline?brl(x.p.precoOnline):'—'}</td>
        <td class="n">${x.cm?brl(x.cm):'—'}</td>
        <td class="n ${x.estoque<=0?'baixo':x.estoque<=x.min?'alerta':''}">${x.estoque}</td>
        <td>
          <button class="btn sec" data-edit="produtos:${x.p.id}">Editar</button>
          <button class="btn x" data-del="produtos:${x.p.id}">Excluir</button>
        </td>
      </tr>`;
    }),
    'Nenhum produto cadastrado.');
}

function renderCompras(){
  const l=[...db.compras].sort((a,b)=>b.data.localeCompare(a.data));
  $('tCompra').innerHTML=tabela([['Data'],['Produto'],['Fornecedor'],['Qtd','n'],['Preço Unit.','n'],['Total','n'],['Pagamento'],['Ações']],
    l.map(x=>`<tr><td>${dbr(x.data)}</td><td>${mini(x.prodId)}${esc(nomeProd(x.prodId))}</td><td>${esc(x.forn)}</td><td class="n">${x.qtd}</td><td class="n">${brl(x.custo)}</td><td class="n">${brl(x.qtd*x.custo)}</td><td>${esc(textoPag(x))}</td><td><button class="btn sec" data-edit="compras:${x.id}">Editar</button> <button class="btn x" data-del="compras:${x.id}">Excluir</button></td></tr>`),
    'Nenhuma compra registrada.');
}

function renderVendas(){
  const l=[...db.vendas].sort((a,b)=>b.data.localeCompare(a.data));
  $('tVenda').innerHTML=tabela([['Data'],['Canal'],['Produto'],['Cliente'],['Qtd','n'],['Valor Total','n'],['Taxa Card','n'],['Líquido','n'],['Pagamento'],['Lucro Liq.','n'],['Ações']],
    l.map(x=>{
      const tot=x.qtd*x.preco;
      const txVal=tot*((x.taxa||0)/100);
      const liq=tot-txVal;
      const lu=liq-(x.qtd*custoMedio(x.prodId));
      return `<tr>
        <td>${dbr(x.data)}</td>
        <td><span class="badge ${x.canal==='Online'?'badge-online':'badge-fisica'}">${x.canal||'Física'}</span></td>
        <td>${mini(x.prodId)}${esc(nomeProd(x.prodId))}</td>
        <td>${esc(x.cli)}</td>
        <td class="n">${x.qtd}</td>
        <td class="n">${brl(tot)}</td>
        <td class="n neg">${x.taxa?x.taxa+'% ('+brl(txVal)+')':'0%'}</td>
        <td class="n">${brl(liq)}</td>
        <td>${esc(textoPag(x))}</td>
        <td class="n ${lu>=0?'pos':'neg'}">${brl(lu)}</td>
        <td>
          <button class="btn rec" data-recibo="${x.id}">Recibo</button>
          <button class="btn sec" data-edit="vendas:${x.id}">Editar</button>
          <button class="btn x" data-del="vendas:${x.id}">Excluir</button>
        </td>
      </tr>`;
    }),
    'Nenhuma venda registrada.');
}

function renderReservas(){
  const l=[...db.reservas].sort((a,b)=>b.data.localeCompare(a.data));
  $('tReserva').innerHTML=tabela([['Data'],['Produto'],['Cliente'],['Valor Total','n'],['Sinal Pago','n'],['Restante','n'],['Status'],['Ações']],
    l.map(x=>{
      const rest=x.total-x.sinal;
      return `<tr>
        <td>${dbr(x.data)}</td>
        <td>${mini(x.prodId)}${esc(nomeProd(x.prodId))}</td>
        <td>${esc(x.cli)}</td>
        <td class="n">${brl(x.total)}</td>
        <td class="n pos">${brl(x.sinal)}</td>
        <td class="n ${rest>0?'alerta':''}">${brl(rest)}</td>
        <td><span class="badge ${x.status==='Ativa'?'badge-reserva':x.status==='Concluída'?'badge-unica':'badge-esgotado'}">${esc(x.status)}</span></td>
        <td>
          <button class="btn sec" data-edit="reservas:${x.id}">Editar</button>
          <button class="btn x" data-del="reservas:${x.id}">Excluir</button>
        </td>
      </tr>`;
    }),
    'Nenhuma reserva ativa.');
}

function renderPerdas(){
  const l=[...db.perdas].sort((a,b)=>b.data.localeCompare(a.data));
  $('tPerda').innerHTML=tabela([['Data'],['Produto'],['Qtd Avariada','n'],['Custo Perda Total','n'],['Motivo'],['Ações']],
    l.map(x=>{
      const cTot = x.qtd * custoMedio(x.prodId);
      return `<tr>
        <td>${dbr(x.data)}</td>
        <td>${mini(x.prodId)}${esc(nomeProd(x.prodId))}</td>
        <td class="n neg">${x.qtd}</td>
        <td class="n neg">${brl(cTot)}</td>
        <td>${esc(x.motivo)}</td>
        <td>
          <button class="btn sec" data-edit="perdas:${x.id}">Editar</button>
          <button class="btn x" data-del="perdas:${x.id}">Excluir</button>
        </td>
      </tr>`;
    }),
    'Nenhuma perda ou avaria registrada.');
}

function renderClientes(){
  $('tCliente').innerHTML=tabela([['Nome'],['Telefone'],['Preferências'],['Total Comprado','n'],['Ações']],
    db.clientes.map(c=>{
      const vends=db.vendas.filter(v=>v.cli&&v.cli.toLowerCase()===c.nome.toLowerCase());
      const totComprado=soma(vends, v=>v.qtd*v.preco);
      return `<tr>
        <td><strong>${esc(c.nome)}</strong></td>
        <td>${esc(c.tel||'—')}</td>
        <td>${esc(c.notas||'—')}</td>
        <td class="n pos">${brl(totComprado)}</td>
        <td>
          <button class="btn sec" data-edit="clientes:${c.id}">Editar</button>
          <button class="btn x" data-del="clientes:${c.id}">Excluir</button>
        </td>
      </tr>`;
    }),
    'Nenhum cliente cadastrado.');
}

function renderFornecedores(){
  $('tFornecedor').innerHTML=tabela([['Empresa / Nome'],['Contato'],['Observações'],['Total Comprado','n'],['Ações']],
    db.fornecedores.map(f=>{
      const comps=db.compras.filter(c=>c.forn&&c.forn.toLowerCase()===f.nome.toLowerCase());
      const totComprado=soma(comps, c=>c.qtd*c.custo);
      return `<tr>
        <td><strong>${esc(f.nome)}</strong></td>
        <td>${esc(f.tel||'—')}</td>
        <td>${esc(f.notas||'—')}</td>
        <td class="n">${brl(totComprado)}</td>
        <td>
          <button class="btn sec" data-edit="fornecedores:${f.id}">Editar</button>
          <button class="btn x" data-del="fornecedores:${f.id}">Excluir</button>
        </td>
      </tr>`;
    }),
    'Nenhum fornecedor cadastrado.');
}

function renderDespesas(){
  const l=[...noPeriodo(db.despesas, $('rDe')?$('rDe').value:'', $('rAte')?$('rAte').value:'')].sort((a,b)=>b.data.localeCompare(a.data));
  $('tDespesa').innerHTML=tabela([['Data'],['Descrição / Categoria'],['Valor','n'],['Ações']],
    l.map(x=>`<tr><td>${dbr(x.data)}</td><td>${esc(x.desc)}</td><td class="n neg">${brl(x.valor)}</td><td><button class="btn sec" data-edit="despesas:${x.id}">Editar</button> <button class="btn x" data-del="despesas:${x.id}">Excluir</button></td></tr>`),
    'Nenhuma despesa registrada.');
}

function renderContas(){
  const mostrar=$('ckPagas').checked,h=hoje();
  const mk=tipo=>{
    const l=listaParc().filter(x=>x.tipo===tipo&&(mostrar||!x.p.pago)).sort((a,b)=>a.p.venc.localeCompare(b.p.venc));
    return tabela([['Vencimento'],['Produto'],[tipo==='v'?'Cliente':'Fornecedor'],['Parcela','n'],['Forma'],['Valor','n'],['Situação'],['Ações']],
      l.map(x=>{const atr=!x.p.pago&&x.p.venc<h;
        return `<tr><td>${dbr(x.p.venc)}</td><td>${mini(x.r.prodId)}${esc(nomeProd(x.r.prodId))}</td><td>${esc(tipo==='v'?x.r.cli:x.r.forn)}</td><td class="n">${x.p.n}/${x.r.parc.length}</td><td>${esc(x.r.forma)}</td><td class="n">${brl(x.p.valor)}</td><td class="${atr?'neg':x.p.pago?'pos':''}">${x.p.pago?'Pago em '+dbr(x.p.dataPag):atr?'Em atraso':'A vencer'}</td><td><button class="btn x ok" data-pay="${tipo}:${x.r.id}:${x.i}">${x.p.pago?'Desfazer':tipo==='v'?'Marcar recebido':'Marcar pago'}</button></td></tr>`}),
      tipo==='v'?'Nenhum valor a receber.':'Nenhum valor a pagar.');
  };
  $('tReceber').innerHTML=mk('v');$('tPagar').innerHTML=mk('c');
}

function renderRel(){
  const de=$('rDe').value, ate=$('rAte').value;
  const r=resumo(de,ate);
  const totalDespesas=soma(noPeriodo(db.despesas,de,ate), x=>x.valor);
  const totalTaxas=soma(r, x=>x.taxasTotal);
  const totalCustoPerdas=soma(r, x=>x.custoPerdas);
  const lucroBrutoTotal=soma(r, x=>x.lucro);
  const lucroLiquidoTotal=lucroBrutoTotal-totalDespesas;

  $('tRel').innerHTML=tabela([['Produto'],['Comprado','n'],['Gasto','n'],['Vendido','n'],['Avarias','n'],['Rec. Bruta','n'],['Taxas Card','n'],['Rec. Líquida','n'],['Lucro','n'],['Estoque','n']],
    r.map(x=>`<tr><td>${esc(x.p.nome)}</td><td class="n">${x.qC}</td><td class="n">${brl(x.gasto)}</td><td class="n">${x.qV}</td><td class="n neg">${x.qP}</td><td class="n">${brl(x.receitaBruta)}</td><td class="n neg">${brl(x.taxasTotal)}</td><td class="n">${brl(x.receitaLiquida)}</td><td class="n ${x.lucro>=0?'pos':'neg'}">${brl(x.lucro)}</td><td class="n">${x.estoque}</td></tr>`),
    'Cadastre produtos e registre movimentações.') + 
    `<div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:8px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border:1px solid var(--line)">
      <span><strong>Lucro Operacional Vendas:</strong> ${brl(lucroBrutoTotal)}</span>
      <span><strong>Perdas / Avarias:</strong> <span class="neg">${brl(totalCustoPerdas)}</span></span>
      <span><strong>Taxas Descontadas Máquina:</strong> <span class="neg">${brl(totalTaxas)}</span></span>
      <span><strong>Despesas Operacionais:</strong> <span class="neg">${brl(totalDespesas)}</span></span>
      <span><strong>LÚCRO LÍQUIDO REAL:</strong> <span class="${lucroLiquidoTotal>=0?'pos':'neg'}" style="font-size:18px">${brl(lucroLiquidoTotal)}</span></span>
    </div>`;
}

let g1,g2,g3,g4;
function renderPainel(){
  const de=$('pDe').value,ate=$('pAte').value,prodFiltro=$('pFiltroProduto').value;
  let r=resumo(de,ate);
  const h=hoje();

  const mesAtualStr = hoje().slice(0,7);
  const vendasMesAtual = db.vendas.filter(v=>v.data.startsWith(mesAtualStr));
  const totVendasMes = soma(vendasMesAtual, v=>v.qtd*v.preco);
  const metaVal = db.meta || 5000;
  $('inputMeta').value = metaVal;
  const pctMeta = Math.min(100, Math.round((totVendasMes / metaVal) * 100));
  $('metaTexto').innerHTML = `Realizado este mês: <strong>${brl(totVendasMes)}</strong> de <strong>${brl(metaVal)}</strong> (${pctMeta}%)`;
  $('metaBarra').style.width = pctMeta + '%';

  const gasto=soma(r,x=>x.gasto);
  const recBruta=soma(r,x=>x.receitaBruta);
  const recLiquida=soma(r,x=>x.receitaLiquida);
  const lucBruto=soma(r,x=>x.lucro);
  const despesaTot=soma(noPeriodo(db.despesas,de,ate), x=>x.valor);
  const lucLiquido=lucBruto-despesaTot;
  const valorEst=soma(r,x=>Math.max(x.estoque,0)*x.cm);

  const qtdVendasTotal = soma(noPeriodo(db.vendas,de,ate), x=>x.qtd);
  const ticketMedio = qtdVendasTotal ? recBruta / qtdVendasTotal : 0;
  const margemMedia = recLiquida ? (lucBruto / recLiquida) * 100 : 0;

  $('stats').innerHTML=`
    <div class="stat"><span>Receita Líquida</span><b>${brl(recLiquida)}</b><small>Bruta: ${brl(recBruta)}</small></div>
    <div class="stat"><span>Ticket Médio</span><b>${brl(ticketMedio)}</b><small>Por unidade vendida</small></div>
    <div class="stat"><span>Margem de Lucro</span><b>${margemMedia.toFixed(1)}%</b></div>
    <div class="stat lucro"><span>Lucro Líquido Real</span><b>${brl(lucLiquido)}</b></div>
    <div class="stat"><span>Estoque em Valor</span><b>${brl(valorEst)}</b></div>`;

  const L=listaParc().filter(x=>!x.p.pago),V=L.filter(x=>x.tipo==='v'),C=L.filter(x=>x.tipo==='c');
  const atrV=V.filter(x=>x.p.venc<h);

  $('stats2').innerHTML=`
    <div class="stat"><span>A receber (vendas)</span><b class="pos">${brl(soma(V,x=>x.p.valor))}</b><small>${V.length} parcela(s)</small></div>
    <div class="stat"><span>Em atraso a receber</span><b class="${atrV.length?'neg':''}">${brl(soma(atrV,x=>x.p.valor))}</b><small>${atrV.length} parcela(s)</small></div>
    <div class="stat"><span>A pagar (compras)</span><b>${brl(soma(C,x=>x.p.valor))}</b><small>${C.length} parcela(s)</small></div>`;

  const rVendasOrdenado = [...r].sort((a,b)=>b.qV - a.qV).slice(0,5);
  $('tRankingPainel').innerHTML=tabela([['Produto'],['Qtd Vendida','n'],['Rec. Bruta','n']],
    rVendasOrdenado.map(x=>`<tr><td>${esc(x.p.nome)}</td><td class="n">${x.qV}</td><td class="n">${brl(x.receitaBruta)}</td></tr>`),
    'Nenhuma venda registrada no período.');

  const prox=[...L].sort((a,b)=>a.p.venc.localeCompare(b.p.venc)).slice(0,5);
  $('tProx').innerHTML=tabela([['Vencimento'],['Tipo'],['Produto'],['Valor','n'],['Situação']],
    prox.map(x=>{const atr=x.p.venc<h;return `<tr><td>${dbr(x.p.venc)}</td><td>${x.tipo==='v'?'A receber':'A pagar'}</td><td>${esc(nomeProd(x.r.prodId))}</td><td class="n">${brl(x.p.valor)}</td><td class="${atr?'neg':''}">${atr?'Em atraso':'A vencer'}</td></tr>`}),
    'Nenhuma parcela em aberto.');

  if(typeof Chart==='undefined')return;
  const meses={};
  noPeriodo(db.compras,de,ate).forEach(x=>{const m=x.data.slice(0,7);(meses[m]=meses[m]||{c:0,v:0,d:0}).c+=x.qtd*x.custo});
  noPeriodo(db.vendas,de,ate).forEach(x=>{const m=x.data.slice(0,7);(meses[m]=meses[m]||{c:0,v:0,d:0}).v+=(x.qtd*x.preco)*(1-(x.taxa||0)/100)});
  noPeriodo(db.despesas,de,ate).forEach(x=>{const m=x.data.slice(0,7);(meses[m]=meses[m]||{c:0,v:0,d:0}).d+=x.valor});

  const ks=Object.keys(meses).sort();
  const cs=getComputedStyle(document.documentElement),cor=n=>cs.getPropertyValue(n).trim(),txt=cor('--muted'),grid=cor('--line');
  const opt={maintainAspectRatio:false,plugins:{legend:{labels:{color:txt}}},scales:{x:{ticks:{color:txt},grid:{color:grid}},y:{ticks:{color:txt,callback:v=>brl(v)},grid:{color:grid}}}};
  [g1,g2,g3,g4].forEach(g=>g&&g.destroy());

  g1=new Chart($('cMes'),{type:'bar',data:{labels:ks.map(k=>k.split('-').reverse().join('/')),datasets:[{label:'Compras',data:ks.map(k=>meses[k].c),backgroundColor:cor('--citrino')},{label:'Vendas Líq.',data:ks.map(k=>meses[k].v),backgroundColor:cor('--primaria')},{label:'Despesas',data:ks.map(k=>meses[k].d),backgroundColor:cor('--vermelho')}]},options:opt});

  let rLucro = r;
  if(prodFiltro){
    rLucro = r.filter(x=>x.p.id===prodFiltro);
  }
  g2=new Chart($('cLucro'),{type:'bar',data:{labels:rLucro.map(x=>x.p.nome),datasets:[{label:'Lucro Bruto',data:rLucro.map(x=>+x.lucro.toFixed(2)),backgroundColor:rLucro.map(x=>x.lucro>=0?cor('--verde'):cor('--vermelho'))}]},options:{...opt,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:opt.scales.y,y:opt.scales.x}}});

  const porForma={};noPeriodo(db.vendas,de,ate).forEach(x=>porForma[x.forma]=(porForma[x.forma]||0)+x.qtd*x.preco);
  const fk=Object.keys(porForma);
  g3=new Chart($('cForma'),{type:'doughnut',data:{labels:fk,datasets:[{data:fk.map(k=>+porForma[k].toFixed(2)),backgroundColor:['#2563eb','#d97706','#10b981','#ef4444','#ec4899','#8b5cf6','#64748b'],borderColor:cor('--card')}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:txt}},tooltip:{callbacks:{label:c=>' '+c.label+': '+brl(c.raw)}}}}});

  const porCanal={Física:0,Online:0};
  noPeriodo(db.vendas,de,ate).forEach(x=>{const c=x.canal||'Física';porCanal[c]=(porCanal[c]||0)+x.qtd*x.preco});
  g4=new Chart($('cCanal'),{type:'pie',data:{labels:['Loja Física','Loja Online'],datasets:[{data:[porCanal['Física'],porCanal['Online']],backgroundColor:[cor('--verde'),cor('--citrino')],borderColor:cor('--card')}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:txt}},tooltip:{callbacks:{label:c=>' '+c.label+': '+brl(c.raw)}}}}});
}

function opcoes(){
  const o=db.produtos.length?db.produtos.map(p=>`<option value="${p.id}">${esc(p.nome)}${p.unica?' (Peça Única)':''}</option>`).join(''):'<option value="">Cadastre um produto antes</option>';
  ['coProd','veProd','reProd','peProd'].forEach(id=>{const v=$(id).value;if($(id))$(id).innerHTML=o;if(v&&$(id))$(id).value=v});

  const filtroProdSelect=$('pFiltroProduto');
  if(filtroProdSelect){
    const vFiltro=filtroProdSelect.value;
    filtroProdSelect.innerHTML='<option value="">Todos os produtos</option>'+(db.produtos.length?db.produtos.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join(''):'');
    filtroProdSelect.value=vFiltro;
  }

  const coFornSelect = $('coFornSelect');
  if(coFornSelect){
    const currentForn = coFornSelect.value;
    coFornSelect.innerHTML = '<option value="">Novo / Outro</option>' + db.fornecedores.map(f=>`<option value="${esc(f.nome)}">${esc(f.nome)}</option>`).join('');
    coFornSelect.value = currentForn;
  }
}

$('coFornSelect').onchange = e => {
  if(e.target.value) $('coForn').value = e.target.value;
};

$('inputMeta').onchange = e => {
  db.meta = +e.target.value || 5000;
  save();
  renderPainel();
};

function render(){
  opcoes();
  renderPainel();
  renderProdutos();
  renderCompras();
  renderVendas();
  renderReservas();
  renderPerdas();
  renderClientes();
  renderFornecedores();
  renderDespesas();
  renderContas();
  renderRel();
}

function payInit(p){
  const f=$(p+'Forma'),n=$(p+'Parc'),v=$(p+'Venc'),d=$(p+'Data');
  f.innerHTML=FORMAS.map(x=>`<option>${x}</option>`).join('');
  n.innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}">${i?(i+1)+'x':'À vista (1x)'}</option>`).join('');
  const upd=()=>{
    const im=IMEDIATAS.includes(f.value);n.disabled=im;v.disabled=im;
    if(im){n.value=1;v.value=d.value;delete v.dataset.m}
    else if(!v.dataset.m&&d.value)v.value=addMeses(d.value,1);
  };
  f.onchange=d.onchange=upd;v.oninput=()=>v.dataset.m=1;
  return upd;
}
function lerPag(p,total,data){
  const forma=$(p+'Forma').value,im=IMEDIATAS.includes(forma);
  const venc=$(p+'Venc').value||addMeses(data,1);
  return{forma,parc:gerarParcelas(total,im?1:+$(p+'Parc').value,venc,im,data)};
}
const updCo=payInit('co'),updVe=payInit('ve');

let fotoNova='';
function lerFoto(file){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=()=>{const im=new Image();
      im.onload=()=>{const s=Math.min(1,480/Math.max(im.width,im.height)),c=document.createElement('canvas');
        c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.72))};
      im.onerror=()=>res('');im.src=r.result};
    r.onerror=()=>res('');r.readAsDataURL(file);
  });
}

function definirFotoNovoProduto(foto){
  fotoNova=foto;
  $('prPrev').src=fotoNova;
  $('prPrev').style.display=fotoNova?'block':'none';
  $('dzText').style.display=fotoNova?'none':'block';
}

$('dzProd').onclick=()=>$('prFoto').click();
$('prFoto').onchange=async e=>{
  const f=e.target.files[0];
  if(f) definirFotoNovoProduto(await lerFoto(f));
};

document.addEventListener('change',async e=>{
  const id=e.target.dataset&&e.target.dataset.foto;if(!id)return;
  const f=e.target.files[0];if(!f)return;
  const foto=await lerFoto(f),p=db.produtos.find(x=>x.id===id);
  if(p&&foto){p.foto=foto;save();render()}
});

document.addEventListener('paste', async e=>{
  const secProdutos=$('produtos');
  if(!secProdutos.classList.contains('on')) return;

  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let file = null;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      file = item.getAsFile();
      break;
    }
  }

  if (!file) return;
  e.preventDefault();

  const foto = await lerFoto(file);
  if (!foto) return;

  const activeLabel = document.activeElement ? document.activeElement.closest('.lbl-foto') : null;
  if(activeLabel && activeLabel.dataset.id){
    const id = activeLabel.dataset.id;
    const p = db.produtos.find(x => x.id === id);
    if(p){
      p.foto = foto;
      save();
      render();
      return;
    }
  }

  definirFotoNovoProduto(foto);
});

function resetFormProd(){
  editProdId=null;
  $('fProd').reset();
  definirFotoNovoProduto('');
  $('prMinimo').value=2;
  $('tituloFormProd').textContent='Novo Produto';
  $('btnSalvarProd').textContent='Salvar produto';
  $('btnCancelarProd').style.display='none';
}
function resetFormCompra(){
  editCompraId=null;
  $('fCompra').reset();
  $('coData').value=hoje();
  delete $('coVenc').dataset.m;
  updCo();
  $('tituloFormCompra').textContent='Registrar Compra';
  $('btnSalvarCompra').textContent='Salvar compra';
  $('btnCancelarCompra').style.display='none';
}
function resetFormVenda(){
  editVendaId=null;
  $('fVenda').reset();
  $('veData').value=hoje();
  $('veTaxa').value=0;
  delete $('veVenc').dataset.m;
  updVe();
  $('tituloFormVenda').textContent='Registrar Venda';
  $('btnSalvarVenda').textContent='Salvar venda';
  $('btnCancelarVenda').style.display='none';
}
function resetFormDespesa(){
  editDespesaId=null;
  $('fDespesa').reset();
  $('deData').value=hoje();
  $('tituloFormDespesa').textContent='Registrar Despesa Operacional';
  $('btnSalvarDespesa').textContent='Salvar despesa';
  $('btnCancelarDespesa').style.display='none';
}
function resetFormCliente(){
  editClienteId=null;
  $('fCliente').reset();
  $('tituloFormCliente').textContent='Cadastrar / Editar Cliente';
  $('btnSalvarCliente').textContent='Salvar cliente';
  $('btnCancelarCliente').style.display='none';
}
function resetFormFornecedor(){
  editFornecedorId=null;
  $('fFornecedor').reset();
  $('tituloFormFornecedor').textContent='Cadastrar / Editar Fornecedor';
  $('btnSalvarFornecedor').textContent='Salvar fornecedor';
  $('btnCancelarFornecedor').style.display='none';
}
function resetFormReserva(){
  editReservaId=null;
  $('fReserva').reset();
  $('reData').value=hoje();
  $('tituloFormReserva').textContent='Registrar Reserva com Sinal';
  $('btnSalvarReserva').textContent='Salvar reserva';
  $('btnCancelarReserva').style.display='none';
}
function resetFormPerda(){
  editPerdaId=null;
  $('fPerda').reset();
  $('peData').value=hoje();
  $('tituloFormPerda').textContent='Registrar Perda / Avaria';
  $('btnSalvarPerda').textContent='Registrar baixa no estoque';
  $('btnCancelarPerda').style.display='none';
}

function carregarEdicaoProduto(id){
  const p=db.produtos.find(x=>x.id===id);
  if(!p)return;
  editProdId=id;
  $('prNome').value=p.nome;
  $('prTipo').value=p.tipo||'';
  $('prPreco').value=p.preco||'';
  $('prPrecoOnline').value=p.precoOnline||'';
  $('prMinimo').value=p.minimo!==undefined?p.minimo:2;
  $('prUnica').checked=!!p.unica;
  definirFotoNovoProduto(p.foto||'');
  $('tituloFormProd').textContent='Editar Produto';
  $('btnSalvarProd').textContent='Atualizar produto';
  $('btnCancelarProd').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoCompra(id){
  const c=db.compras.find(x=>x.id===id);
  if(!c)return;
  editCompraId=id;
  $('coData').value=c.data;
  $('coProd').value=c.prodId;
  $('coQtd').value=c.qtd;
  $('coCusto').value=c.custo;
  $('coForn').value=c.forn||'';
  $('coForma').value=c.forma;
  $('coParc').value=c.parc.length;
  $('coParc').disabled=IMEDIATAS.includes(c.forma);
  $('coVenc').value=c.parc[0]?c.parc[0].venc:c.data;
  $('coVenc').disabled=IMEDIATAS.includes(c.forma);
  $('tituloFormCompra').textContent='Editar Compra';
  $('btnSalvarCompra').textContent='Atualizar compra';
  $('btnCancelarCompra').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoVenda(id){
  const v=db.vendas.find(x=>x.id===id);
  if(!v)return;
  editVendaId=id;
  $('veData').value=v.data;
  $('veCanal').value=v.canal||'Física';
  $('veProd').value=v.prodId;
  $('veQtd').value=v.qtd;
  $('vePreco').value=v.preco;
  $('veCli').value=v.cli||'';
  $('veTaxa').value=v.taxa||0;
  $('veForma').value=v.forma;
  $('veParc').value=v.parc.length;
  $('veParc').disabled=IMEDIATAS.includes(v.forma);
  $('veVenc').value=v.parc[0]?v.parc[0].venc:v.data;
  $('veVenc').disabled=IMEDIATAS.includes(v.forma);
  $('tituloFormVenda').textContent='Editar Venda';
  $('btnSalvarVenda').textContent='Atualizar venda';
  $('btnCancelarVenda').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoDespesa(id){
  const d=db.despesas.find(x=>x.id===id);
  if(!d)return;
  editDespesaId=id;
  $('deData').value=d.data;
  $('deDesc').value=d.desc;
  $('deValor').value=d.valor;
  $('tituloFormDespesa').textContent='Editar Despesa';
  $('btnSalvarDespesa').textContent='Atualizar despesa';
  $('btnCancelarDespesa').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoCliente(id){
  const c=db.clientes.find(x=>x.id===id);
  if(!c)return;
  editClienteId=id;
  $('cliNome').value=c.nome;
  $('cliTel').value=c.tel||'';
  $('cliNotas').value=c.notas||'';
  $('tituloFormCliente').textContent='Editar Cliente';
  $('btnSalvarCliente').textContent='Atualizar cliente';
  $('btnCancelarCliente').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoFornecedor(id){
  const f=db.fornecedores.find(x=>x.id===id);
  if(!f)return;
  editFornecedorId=id;
  $('forNome').value=f.nome;
  $('forTel').value=f.tel||'';
  $('forNotas').value=f.notas||'';
  $('tituloFormFornecedor').textContent='Editar Fornecedor';
  $('btnSalvarFornecedor').textContent='Atualizar fornecedor';
  $('btnCancelarFornecedor').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoReserva(id){
  const r=db.reservas.find(x=>x.id===id);
  if(!r)return;
  editReservaId=id;
  $('reData').value=r.data;
  $('reProd').value=r.prodId;
  $('reCli').value=r.cli;
  $('reTotal').value=r.total;
  $('reSinal').value=r.sinal;
  $('reStatus').value=r.status;
  $('tituloFormReserva').textContent='Editar Reserva';
  $('btnSalvarReserva').textContent='Atualizar reserva';
  $('btnCancelarReserva').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

function carregarEdicaoPerda(id){
  const p=db.perdas.find(x=>x.id===id);
  if(!p)return;
  editPerdaId=id;
  $('peData').value=p.data;
  $('peProd').value=p.prodId;
  $('peQtd').value=p.qtd;
  $('peMotivo').value=p.motivo;
  $('tituloFormPerda').textContent='Editar Perda / Avaria';
  $('btnSalvarPerda').textContent='Atualizar perda';
  $('btnCancelarPerda').style.display='inline-block';
  window.scrollTo({top:0,behavior:'smooth'});
}

$('btnCancelarProd').onclick=resetFormProd;
$('btnCancelarCompra').onclick=resetFormCompra;
$('btnCancelarVenda').onclick=resetFormVenda;
$('btnCancelarDespesa').onclick=resetFormDespesa;
$('btnCancelarCliente').onclick=resetFormCliente;
$('btnCancelarFornecedor').onclick=resetFormFornecedor;
$('btnCancelarReserva').onclick=resetFormReserva;
$('btnCancelarPerda').onclick=resetFormPerda;

$('fProd').onsubmit=e=>{e.preventDefault();
  const nome=$('prNome').value.trim();
  const tipo=$('prTipo').value.trim();
  const preco=+$('prPreco').value||0;
  const precoOnline=+$('prPrecoOnline').value||0;
  const minimo=+$('prMinimo').value||0;
  const unica=$('prUnica').checked;

  if(editProdId){
    const p=db.produtos.find(x=>x.id===editProdId);
    if(p){p.nome=nome;p.tipo=tipo;p.preco=preco;p.precoOnline=precoOnline;p.minimo=minimo;p.unica=unica;if(fotoNova)p.foto=fotoNova}
  }else{
    db.produtos.push({id:uid(),nome,tipo,preco,precoOnline,minimo,unica,foto:fotoNova});
  }
  save();resetFormProd();render();
};

$('fCompra').onsubmit=e=>{e.preventDefault();if(!$('coProd').value)return alert('Cadastre um produto primeiro.');
  const data=$('coData').value,qtd=+$('coQtd').value,custo=+$('coCusto').value,forn=$('coForn').value.trim();
  const total=qtd*custo;
  
  if(forn && !db.fornecedores.some(f=>f.nome.toLowerCase()===forn.toLowerCase())){
    db.fornecedores.push({id:uid(),nome:forn,tel:'',notas:'Cadastrado via compra'});
  }

  if(editCompraId){
    const c=db.compras.find(x=>x.id===editCompraId);
    if(c){c.data=data;c.prodId=$('coProd').value;c.qtd=qtd;c.custo=custo;c.forn=forn;const pg=lerPag('co',total,data);c.forma=pg.forma;c.parc=pg.parc}
  }else{
    const pg=lerPag('co',total,data);
    db.compras.push({id:uid(),data,prodId:$('coProd').value,qtd,custo,forn,...pg});
  }
  save();resetFormCompra();render();
};

$('fVenda').onsubmit=e=>{e.preventDefault();if(!$('veProd').value)return alert('Cadastre um produto primeiro.');
  const id=$('veProd').value,q=+$('veQtd').value,data=$('veData').value,preco=+$('vePreco').value,cli=$('veCli').value.trim(),taxa=+$('veTaxa').value||0,canal=$('veCanal').value;
  const pObj=db.produtos.find(x=>x.id===id);

  if(pObj && pObj.unica && q>1){
    return alert('Este produto é uma Peça Única. Quantidade não pode exceder 1 unidade.');
  }

  const est=soma(db.compras.filter(x=>x.prodId===id),x=>x.qtd)-soma(db.vendas.filter(x=>x.id!==editVendaId&&x.prodId===id),x=>x.qtd)-soma(db.perdas.filter(x=>x.prodId===id),x=>x.qtd);
  if(q>est&&!confirm(`Só há ${est} em estoque. Registrar a venda mesmo assim?`))return;
  const total=q*preco;
  
  if(cli && !db.clientes.some(c=>c.nome.toLowerCase()===cli.toLowerCase())){
    db.clientes.push({id:uid(),nome:cli,tel:'',notas:'Cadastrado via venda'});
  }

  if(editVendaId){
    const v=db.vendas.find(x=>x.id===editVendaId);
    if(v){v.data=data;v.canal=canal;v.prodId=id;v.qtd=q;v.preco=preco;v.cli=cli;v.taxa=taxa;const pg=lerPag('ve',total,data);v.forma=pg.forma;v.parc=pg.parc}
  }else{
    const pg=lerPag('ve',total,data);
    db.vendas.push({id:uid(),data,canal,prodId:id,qtd:q,preco,cli,taxa,...pg});
  }
  save();resetFormVenda();render();
};

$('fDespesa').onsubmit=e=>{e.preventDefault();
  const data=$('deData').value, desc=$('deDesc').value.trim(), valor=+$('deValor').value||0;
  if(editDespesaId){
    const d=db.despesas.find(x=>x.id===editDespesaId);
    if(d){d.data=data;d.desc=desc;d.valor=valor}
  }else{
    db.despesas.push({id:uid(),data,desc,valor});
  }
  save();resetFormDespesa();render();
};

$('fCliente').onsubmit=e=>{e.preventDefault();
  const nome=$('cliNome').value.trim(), tel=$('cliTel').value.trim(), notas=$('cliNotas').value.trim();
  if(editClienteId){
    const c=db.clientes.find(x=>x.id===editClienteId);
    if(c){c.nome=nome;c.tel=tel;c.notas=notas}
  }else{
    db.clientes.push({id:uid(),nome,tel,notas});
  }
  save();resetFormCliente();render();
};

$('fFornecedor').onsubmit=e=>{e.preventDefault();
  const nome=$('forNome').value.trim(), tel=$('forTel').value.trim(), notas=$('forNotas').value.trim();
  if(editFornecedorId){
    const f=db.fornecedores.find(x=>x.id===editFornecedorId);
    if(f){f.nome=nome;f.tel=tel;f.notas=notas}
  }else{
    db.fornecedores.push({id:uid(),nome,tel,notas});
  }
  save();resetFormFornecedor();render();
};

$('fReserva').onsubmit=e=>{e.preventDefault();if(!$('reProd').value)return alert('Cadastre um produto primeiro.');
  const data=$('reData').value, prodId=$('reProd').value, cli=$('reCli').value.trim(), total=+$('reTotal').value||0, sinal=+$('reSinal').value||0, status=$('reStatus').value;
  if(editReservaId){
    const r=db.reservas.find(x=>x.id===editReservaId);
    if(r){r.data=data;r.prodId=prodId;r.cli=cli;r.total=total;r.sinal=sinal;r.status=status}
  }else{
    db.reservas.push({id:uid(),data,prodId,cli,total,sinal,status});
  }
  save();resetFormReserva();render();
};

$('fPerda').onsubmit=e=>{e.preventDefault();if(!$('peProd').value)return alert('Cadastre um produto primeiro.');
  const data=$('peData').value, prodId=$('peProd').value, qtd=+$('peQtd').value||1, motivo=$('peMotivo').value.trim();
  if(editPerdaId){
    const p=db.perdas.find(x=>x.id===editPerdaId);
    if(p){p.data=data;p.prodId=prodId;p.qtd=qtd;p.motivo=motivo}
  }else{
    db.perdas.push({id:uid(),data,prodId,qtd,motivo});
  }
  save();resetFormPerda();render();
};

function atualizarPrecoVendaSugerido(){
  const p=db.produtos.find(x=>x.id===$('veProd').value);
  const canal=$('veCanal').value;
  if(p){
    if(canal==='Online' && p.precoOnline) {
      $('vePreco').value=p.precoOnline;
    } else if(p.preco) {
      $('vePreco').value=p.preco;
    }
    if(p.unica) $('veQtd').value=1;
  }
}

$('veProd').onchange = atualizarPrecoVendaSugerido;
$('veCanal').onchange = atualizarPrecoVendaSugerido;

$('reProd').onchange=()=>{
  const p=db.produtos.find(x=>x.id===$('reProd').value);
  if(p && p.preco) $('reTotal').value=p.preco;
};

function gerarRecibo(vendaId){
  const v=db.vendas.find(x=>x.id===vendaId);
  if(!v)return;
  const prod=db.produtos.find(x=>x.id===v.prodId);
  const total=v.qtd*v.preco;
  const txVal=total*((v.taxa||0)/100);

  $('reciboConteudo').innerHTML=`
    <div class="recibo-line"><span>Data:</span><span>${dbr(v.data)}</span></div>
    <div class="recibo-line"><span>Canal:</span><span>${v.canal||'Física'}</span></div>
    <div class="recibo-line"><span>Cliente:</span><span>${esc(v.cli||'Não informado')}</span></div>
    <div style="border-top:1px dashed #ccc;margin:8px 0"></div>
    <div class="recibo-line"><span>Item:</span><span>${esc(prod?prod.nome:'(removido)')}</span></div>
    <div class="recibo-line"><span>Qtd x Preço:</span><span>${v.qtd}x ${brl(v.preco)}</span></div>
    <div class="recibo-line"><span>Pagamento:</span><span>${esc(textoPag(v))}</span></div>
    ${v.taxa?`<div class="recibo-line" style="font-size:12px;color:#666"><span>Taxa cartão (${v.taxa}%):</span><span>-${brl(txVal)}</span></div>`:''}
    <div class="recibo-line recibo-total"><span>TOTAL:</span><span>${brl(total)}</span></div>
  `;
  $('modalRecibo').classList.add('on');
}
function fecharRecibo(){$('modalRecibo').classList.remove('on')}

document.addEventListener('click',e=>{
  const d=e.target.dataset&&e.target.dataset.del;
  const ed=e.target.dataset&&e.target.dataset.edit;
  const py=e.target.dataset&&e.target.dataset.pay;
  const rc=e.target.dataset&&e.target.dataset.recibo;

  if(rc){gerarRecibo(rc);return}
  if(py){
    const [t,id,i]=py.split(':'),r=db[t==='v'?'vendas':'compras'].find(x=>x.id===id);
    if(r){const p=r.parc[+i];p.pago=!p.pago;p.dataPag=p.pago?hoje():'';save();render()}
    return;
  }
  if(ed){
    const [t,id]=ed.split(':');
    if(t==='produtos')carregarEdicaoProduto(id);
    if(t==='compras')carregarEdicaoCompra(id);
    if(t==='vendas')carregarEdicaoVenda(id);
    if(t==='despesas')carregarEdicaoDespesa(id);
    if(t==='clientes')carregarEdicaoCliente(id);
    if(t==='fornecedores')carregarEdicaoFornecedor(id);
    if(t==='reservas')carregarEdicaoReserva(id);
    if(t==='perdas')carregarEdicaoPerda(id);
    return;
  }
  if(!d)return;
  const [t,id]=d.split(':');
  if(t==='produtos'&&(db.compras.some(x=>x.prodId===id)||db.vendas.some(x=>x.prodId===id)))return alert('Este produto tem histórico. Exclua esses registros antes.');
  if(!confirm('Excluir este registro?'))return;
  db[t]=db[t].filter(x=>x.id!==id);save();render();
});

['pDe','pAte'].forEach(i=>$(i).onchange=renderPainel);
$('pFiltroProduto').onchange=renderPainel;
['rDe','rAte'].forEach(i=>$(i).onchange=renderRel);
$('ckPagas').onchange=renderContas;
$('pLimpa').onclick=()=>{$('pDe').value=$('pAte').value='';$('pFiltroProduto').value='';renderPainel()};
$('rLimpa').onclick=()=>{$('rDe').value=$('rAte').value='';renderRel()};

$('bExcel').onclick=()=>{
  if(typeof XLSX==='undefined')return alert('Biblioteca Excel indisponível.');
  const de=$('rDe').value, ate=$('rAte').value;
  const r=resumo(de,ate),h=hoje();
  const wb=XLSX.utils.book_new();
  const add=(nome,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{Aviso:'Sem dados'}]),nome);
  add('Resumo',r.map(x=>({Produto:x.p.nome,Tipo:x.p.tipo,'Peça Única':x.unica?'Sim':'Não','Qtd Comprada':x.qC,'Gasto (R$)':+x.gasto.toFixed(2),'Qtd Vendida':x.qV,'Avarias':x.qP,'Rec. Bruta (R$)':+x.receitaBruta.toFixed(2),'Taxas (R$)':+x.taxasTotal.toFixed(2),'Rec. Líquida (R$)':+x.receitaLiquida.toFixed(2),'Lucro (R$)':+x.lucro.toFixed(2),Estoque:x.estoque})));
  add('Compras',db.compras.map(x=>({Data:dbr(x.data),Produto:nomeProd(x.prodId),Fornecedor:x.forn,Quantidade:x.qtd,'Custo Unit. (R$)':x.custo,'Total (R$)':+(x.qtd*x.custo).toFixed(2),Pagamento:x.forma})));
  add('Vendas',db.vendas.map(x=>({Data:dbr(x.data),Canal:x.canal||'Física',Produto:nomeProd(x.prodId),Cliente:x.cli,Quantidade:x.qtd,'Preço Unit. (R$)':x.preco,'Total Bruto (R$)':+(x.qtd*x.preco).toFixed(2),'Taxa (%)':x.taxa||0,Pagamento:x.forma})));
  add('Reservas',db.reservas.map(x=>({Data:dbr(x.data),Produto:nomeProd(x.prodId),Cliente:x.cli,'Total (R$)':x.total,'Sinal (R$)':x.sinal,Status:x.status})));
  add('Perdas',db.perdas.map(x=>({Data:dbr(x.data),Produto:nomeProd(x.prodId),Quantidade:x.qtd,Motivo:x.motivo})));
  add('Clientes',db.clientes.map(c=>({Nome:c.nome,Telefone:c.tel,Notas:c.notas})));
  add('Fornecedores',db.fornecedores.map(f=>({Empresa:f.nome,Contato:f.tel,Notas:f.notas})));
  add('Despesas',db.despesas.map(x=>({Data:dbr(x.data),Descrição:x.desc,'Valor (R$)':x.valor})));
  XLSX.writeFile(wb,`loja-pedras-${h}.xlsx`);
};

$('bBackup').onclick=()=>{
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db)],{type:'application/json'}));
  a.download=`backup-loja-pedras-${hoje()}.json`;a.click();
};

$('bRest').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!d.produtos||!d.compras||!d.vendas)throw 0;
    if(confirm('Isto substitui os dados atuais pelos do backup. Continuar?')){
      db=d;
      if(!db.despesas) db.despesas=[];
      if(!db.clientes) db.clientes=[];
      if(!db.reservas) db.reservas=[];
      if(!db.perdas) db.perdas=[];
      if(!db.fornecedores) db.fornecedores=[];
      if(!db.meta) db.meta=5000;
      save();render()}}catch(x){alert('Arquivo de backup inválido.')}};
  rd.readAsText(f);e.target.value='';
};

$('coData').value=$('veData').value=$('deData').value=$('reData').value=$('peData').value=hoje();
updCo();updVe();
render();