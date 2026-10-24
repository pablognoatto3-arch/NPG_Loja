// Utilitário de seleção rápida
const $ = id => document.getElementById(id);

// Estrutura de dados principal carregada do localStorage ou inicializada
let db = JSON.parse(localStorage.getItem('npg_loja_db')) || {
  produtos: [],
  vendas: [],
  compras: [],
  despesas: [],
  clientes: [],
  fornecedores: [],
  reservas: [],
  perdas: []
};

let editProdId = null;
let fotoNova = '';
let graficoVendasInstancia = null;
let graficoProdutosInstancia = null;

// Gravar no localStorage
function salvarDB() {
  localStorage.setItem('npg_loja_db', JSON.stringify(db));
  atualizarDashboard();
}

// Controlo do Menu Lateral
function toggleSidebar() {
  const sidebar = $('sidebar');
  if (sidebar) sidebar.classList.toggle('recolhido');
}

// Navegação entre seções
function mudarSecao(secaoId, botaoEl) {
  document.querySelectorAll('main section').forEach(sec => sec.classList.remove('on'));
  const alvo = $(secaoId);
  if (alvo) alvo.classList.add('on');

  document.querySelectorAll('aside nav button').forEach(btn => btn.classList.remove('on'));
  if (botaoEl) botaoEl.classList.add('on');

  const tituloPagina = $('titulo-pagina');
  if (tituloPagina && botaoEl) {
    tituloPagina.textContent = botaoEl.textContent.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Se entrar no dashboard, atualiza os gráficos
  if (secaoId === 'dashboard') {
    atualizarDashboard();
  }
}

// ==========================================
// 1. GESTÃO DE PRODUTOS
// ==========================================
function resetFormProd() {
  editProdId = null;
  const fProd = $('fProd');
  if (fProd) fProd.reset();
  if ($('prMinimo')) $('prMinimo').value = 2;
  if ($('prEstoque')) $('prEstoque').value = 0;
  if ($('tituloFormProd')) $('tituloFormProd').textContent = 'Novo Produto';
  if ($('btnSalvarProd')) $('btnSalvarProd').textContent = 'Salvar produto';
  if ($('btnCancelarProd')) $('btnCancelarProd').style.display = 'none';
}

const fProdEl = $('fProd');
if (fProdEl) {
  fProdEl.onsubmit = e => {
    e.preventDefault();
    const nome = $('prNome').value.trim();
    const tipo = $('prTipo').value.trim();
    const preco = +$('prPreco').value || 0;
    const precoOnline = +$('prPrecoOnline').value || 0;
    const minimo = +$('prMinimo').value || 0;
    const unica = $('prUnica').checked;
    const estoqueInicial = +$('prEstoque').value || 0;

    if (editProdId) {
      const p = db.produtos.find(x => x.id === editProdId);
      if (p) {
        p.nome = nome;
        p.tipo = tipo;
        p.preco = preco;
        p.precoOnline = precoOnline;
        p.minimo = minimo;
        p.unica = unica;
        if (fotoNova) p.foto = fotoNova;
      }
    } else {
      const novoProduto = {
        id: Date.now(),
        nome,
        tipo,
        preco,
        precoOnline,
        minimo,
        unica,
        estoque: estoqueInicial,
        foto: fotoNova || ''
      };
      db.produtos.push(novoProduto);
    }

    salvarDB();
    atualizarTabelaProdutos();
    resetFormProd();
  };
}

const btnCancelarProd = $('btnCancelarProd');
if (btnCancelarProd) btnCancelarProd.onclick = resetFormProd;

function atualizarTabelaProdutos() {
  const tbody = $('tabelaProdutos');
  if (!tbody) return;

  const termoFiltro = $('filtroProdNome') ? $('filtroProdNome').value.toLowerCase() : '';
  const produtosFiltrados = db.produtos.filter(p => p.nome.toLowerCase().includes(termoFiltro));

  if (produtosFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = produtosFiltrados.map(p => `
    <tr>
      <td>${p.foto ? `<img src="${p.foto}" class="thumb">` : `<div class="sem">Sem foto</div>`}</td>
      <td><b>${p.nome}</b></td>
      <td>${p.tipo || '-'}</td>
      <td class="n">${p.preco.toFixed(2)} €</td>
      <td class="n">${p.precoOnline ? p.precoOnline.toFixed(2) + ' €' : '-'}</td>
      <td class="n"><b>${p.estoque}</b></td>
      <td>
        <button class="btn x" onclick="editarProduto(${p.id})">Editar</button>
        <button class="btn x" onclick="eliminarProduto(${p.id})" style="color:var(--vermelho)">Excluir</button>
      </td>
    </tr>
  `).join('');
}

const filtroProdNome = $('filtroProdNome');
if (filtroProdNome) filtroProdNome.oninput = atualizarTabelaProdutos;

function editarProduto(id) {
  const p = db.produtos.find(x => x.id === id);
  if (!p) return;

  editProdId = p.id;
  $('prNome').value = p.nome;
  $('prTipo').value = p.tipo || '';
  $('prPreco').value = p.preco;
  $('prPrecoOnline').value = p.precoOnline || '';
  $('prMinimo').value = p.minimo || 2;
  $('prEstoque').value = p.estoque;
  $('prUnica').checked = !!p.unica;

  if ($('tituloFormProd')) $('tituloFormProd').textContent = 'Editar Produto';
  if ($('btnSalvarProd')) $('btnSalvarProd').textContent = 'Atualizar produto';
  if ($('btnCancelarProd')) $('btnCancelarProd').style.display = 'inline-flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarProduto(id) {
  if (confirm('Tem certeza de que pretende eliminar este produto?')) {
    db.produtos = db.produtos.filter(x => x.id !== id);
    salvarDB();
    atualizarTabelaProdutos();
  }
}

// ==========================================
// 2. DASHBOARD E GRÁFICOS (CHART.JS)
// ==========================================
function atualizarDashboard() {
  // Calcular KPIs
  const totalFaturamento = db.vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalDespesas = db.despesas.reduce((acc, d) => acc + (d.valor || 0), 0);
  const totalCompras = db.compras.reduce((acc, c) => acc + (c.total || 0), 0);
  
  // Lucro Bruto simulado (Faturamento - Custo de Compras proporcional ou estimado, ex: 50% ou direto)
  const lucroBruto = totalFaturamento * 0.4; // Exemplo de margem estimada ou cálculo real se associado a compras
  const saldoFinal = totalFaturamento - totalDespesas - totalCompras;

  if ($('kpi-fat')) $('kpi-fat').textContent = totalFaturamento.toFixed(2) + ' €';
  if ($('kpi-lucro')) $('kpi-lucro').textContent = lucroBruto.toFixed(2) + ' €';
  if ($('kpi-despesa')) $('kpi-despesa').textContent = totalDespesas.toFixed(2) + ' €';
  if ($('kpi-saldo')) $('kpi-saldo').textContent = saldoFinal.toFixed(2) + ' €';

  renderizarGraficos();
}

function renderizarGraficos() {
  // Gráfico de Vendas
  const ctxVendas = $('graficoVendas');
  if (ctxVendas) {
    if (graficoVendasInstancia) graficoVendasInstancia.destroy();
    
    // Agrupar vendas por data ou criar dados de exemplo
    graficoVendasInstancia = new Chart(ctxVendas, {
      type: 'line',
      data: {
        labels: db.vendas.map(v => v.data || 'Registo'),
        datasets: [{
          label: 'Faturamento (€)',
          data: db.vendas.map(v => v.total || 0),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Gráfico de Top Produtos
  const ctxProdutos = $('graficoProdutos');
  if (ctxProdutos) {
    if (graficoProdutosInstancia) graficoProdutosInstancia.destroy();

    graficoProdutosInstancia = new Chart(ctxProdutos, {
      type: 'bar',
      data: {
        labels: db.produtos.slice(0, 5).map(p => p.nome),
        datasets: [{
          label: 'Estoque Atual',
          data: db.produtos.slice(0, 5).map(p => p.estoque),
          backgroundColor: '#10b981'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// ==========================================
// 3. BACKUP E RESTAURAÇÃO
// ==========================================
function baixarBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  const dataAtual = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `backup-npg-pedras-${dataAtual}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function restaurarBackup(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = function(e) {
    try {
      const dadosRestaurados = JSON.parse(e.target.result);
      if (dadosRestaurados && dadosRestaurados.produtos) {
        db = dadosRestaurados;
        salvarDB();
        atualizarTabelaProdutos();
        alert('Backup restaurado com sucesso!');
        location.reload();
      } else {
        alert('O arquivo selecionado não é um formato de backup válido.');
      }
    } catch (erro) {
      alert('Erro ao ler o arquivo de backup.');
    }
  };
  leitor.readAsText(arquivo);
}

// Inicialização Global
window.addEventListener('DOMContentLoaded', () => {
  atualizarTabelaProdutos();
  atualizarDashboard();
});
