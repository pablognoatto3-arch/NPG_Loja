<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NPG - Gestão de Pedras Naturais</title>
  
  <!-- Favicon / Ícone do Site -->
  <link rel="icon" type="image/png" href="logo.png">
  
  <!-- Estilos CSS -->
  <link rel="stylesheet" href="style.css">
  
  <!-- Biblioteca Chart.js para os gráficos do painel -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</head>
<body>

  <!-- Menu Lateral de Navegação -->
  <aside id="sidebar">
    <div class="sidebar-header">
      <h2>NPG Pedras</h2>
      <p>Gestão de Loja</p>
    </div>
    <button class="sidebar-toggle" onclick="toggleSidebar()">☰ Menu</button>
    <nav>
      <button class="on" onclick="mudarSecao('dashboard', this)">📊 <span class="nav-text">Dashboard</span></button>
      <button onclick="mudarSecao('produtos', this)">💎 <span class="nav-text">Produtos</span></button>
      <button onclick="mudarSecao('vendas', this)">🛒 <span class="nav-text">Vendas</span></button>
      <button onclick="mudarSecao('compras', this)">📦 <span class="nav-text">Compras</span></button>
      <button onclick="mudarSecao('despesas', this)">💸 <span class="nav-text">Despesas</span></button>
      <button onclick="mudarSecao('clientes', this)">👥 <span class="nav-text">Clientes</span></button>
      <button onclick="mudarSecao('fornecedores', this)">🏭 <span class="nav-text">Fornecedores</span></button>
      <button onclick="mudarSecao('reservas', this)">📌 <span class="nav-text">Reservas</span></button>
      <button onclick="mudarSecao('perdas', this)">⚠️ <span class="nav-text">Perdas</span></button>
      <button onclick="mudarSecao('relatorios', this)">📑 <span class="nav-text">Relatório / DRE</span></button>
    </nav>
  </aside>

  <!-- Estrutura Principal -->
  <div class="main-wrapper">
    <header>
      <h1 id="titulo-pagina">Dashboard</h1>
      <p>Controlo operacional e financeiro do negócio</p>
    </header>

    <main>
      <!-- Seção: Dashboard -->
      <section id="dashboard" class="on">
        <div class="stats">
          <div class="stat"><span>Faturamento</span><b id="kpi-fat">0,00 €</b></div>
          <div class="stat"><span>Lucro Bruto</span><b id="kpi-lucro">0,00 €</b></div>
          <div class="stat"><span>Despesas</span><b id="kpi-despesa">0,00 €</b></div>
          <div class="stat lucro"><span>Saldo Final</span><b id="kpi-saldo">0,00 €</b></div>
        </div>
        <div class="grid2">
          <div class="box">
            <h2>Vendas por Período</h2>
            <div class="chart"><canvas id="graficoVendas"></canvas></div>
          </div>
          <div class="box">
            <h2>Top Produtos</h2>
            <div class="chart"><canvas id="graficoProdutos"></canvas></div>
          </div>
        </div>
      </section>

      <!-- Seção: Produtos -->
      <section id="produtos">
        <div class="box">
          <h2 id="tituloFormProd">Novo Produto</h2>
          <form id="fProd">
            <label>Nome do Produto:
              <input type="text" id="prNome" required>
            </label>
            <label>Tipo / Categoria:
              <input type="text" id="prTipo">
            </label>
            <label>Preço Físico:
              <input type="number" step="0.01" id="prPreco" required>
            </label>
            <label>Preço Online:
              <input type="number" step="0.01" id="prPrecoOnline">
            </label>
            <label>Stock Mínimo:
              <input type="number" id="prMinimo" value="2">
            </label>
            
            <!-- Campo de Estoque Inicial integrado -->
            <label>Estoque Inicial:
              <input type="number" id="prEstoque" min="0" value="0" required>
            </label>
            
            <label style="flex-direction:row; align-items:center; gap:8px;">
              <input type="checkbox" id="prUnica"> Peça Única
            </label>
            
            <div style="grid-column: 1 / -1; display:flex; gap:10px; margin-top:10px;">
              <button type="submit" class="btn" id="btnSalvarProd">Salvar produto</button>
              <button type="button" class="btn sec" id="btnCancelarProd" style="display:none;">Cancelar</button>
            </div>
          </form>
        </div>

        <div class="box">
          <h2>Lista de Produtos</h2>
          <div class="bar">
            <label>Pesquisar: <input type="text" id="filtroProdNome" placeholder="Nome do mineral..."></label>
          </div>
          <div class="tw">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th class="n">Preço Físico</th>
                  <th class="n">Preço Online</th>
                  <th class="n">Estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="tabelaProdutos">
                <tr><td colspan="7" class="vazio">Nenhum produto cadastrado.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Demais Seções do Sistema -->
      <section id="vendas"><div class="box"><h2>Registar Venda</h2></div></section>
      <section id="compras"><div class="box"><h2>Registar Compra</h2></div></section>
      <section id="despesas"><div class="box"><h2>Registar Despesa</h2></div></section>
      <section id="clientes"><div class="box"><h2>Gestão de Clientes</h2></div></section>
      <section id="fornecedores"><div class="box"><h2>Gestão de Fornecedores</h2></div></section>
      <section id="reservas"><div class="box"><h2>Gestão de Reservas</h2></div></section>
      <section id="perdas"><div class="box"><h2>Registo de Perdas</h2></div></section>
      
      <!-- Seção: Relatórios e Backup -->
      <section id="relatorios">
        <div class="box">
          <h2>Relatório e Sincronização de Dados</h2>
          <div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap;">
            <button class="btn" onclick="baixarBackup()">Baixar backup</button>
            <label class="btn sec" style="cursor:pointer; margin:0; display:inline-flex; align-items:center;">
              Restaurar backup <input type="file" id="inputBackup" style="display:none" onchange="restaurarBackup(event)">
            </label>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- Script JavaScript Principal -->
  <script src="app.js"></script>
</body>
</html>