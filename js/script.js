// Cria dynamicamente os campos para digitar a tensão de cada gerador
function gerarCamposGeradores() {
  const qtd = parseInt(document.getElementById("qtdGeradores").value) || 1;
  const container = document.getElementById("containerGeradores");
  container.innerHTML = "";

  for (let i = 1; i <= qtd; i++) {
    container.innerHTML += `
        <div class="campo">
            <label>FEM / Tensão do Gerador ${i} (V):</label>
            <input type="number" class="val-gerador" value="12" min="0" step="any">
        </div>
    `;
  }
}

// Cria dinamicamente os campos para os resistores
function gerarCamposResistores() {
  const tipo = document.getElementById("tipo").value;
  let qtd = parseInt(document.getElementById("qtdResistores").value) || 1;

  // Regra: circuito misto exige no mínimo 3 resistores
  if (tipo === "misto" && qtd < 3) {
    qtd = 3;
    document.getElementById("qtdResistores").value = 3;
  }

  const container = document.getElementById("containerResistores");
  container.innerHTML = "";

  for (let i = 1; i <= qtd; i++) {
    let dica =
      tipo === "misto" && i === 1
        ? " (Em Série)"
        : tipo === "misto"
          ? " (Em Paralelo)"
          : "";

    container.innerHTML += `
            <div class="campo">
                <label>Resistência R${i}${dica} (Ω):</label>
                <input type="number" class="val-resistor" value="${10 * i}" min="0.1" step="any">
            </div>
        `;
  }
}

function calcular() {
  // 1. Somar a Tensão Total dos Geradores em série
  const inputsGeradores = document.querySelectorAll(".val-gerador");
  let vTotal = 0;
  inputsGeradores.forEach((input) => (vTotal += parseFloat(input.value) || 0));

  // 2. Ler os valores dos Resistores
  const inputsResistores = document.querySelectorAll(".val-resistor");
  const resistores = [];
  inputsResistores.forEach((input) =>
    resistores.push(parseFloat(input.value) || 0),
  );

  const tipo = document.getElementById("tipo").value;
  const n = resistores.length;

  let req = 0;
  let correntes = new Array(n).fill(0);
  let tensoes = new Array(n).fill(0);

  // 3. Cálculos de R_eq, V e I de acordo com a associação
  if (tipo === "serie") {
    req = resistores.reduce((acc, r) => acc + r, 0);
    const iTotal = req > 0 ? vTotal / req : 0;

    for (let i = 0; i < n; i++) {
      correntes[i] = iTotal;
      tensoes[i] = iTotal * resistores[i];
    }
  } else if (tipo === "paralelo") {
    let somaInversos = resistores.reduce((acc, r) => acc + 1 / r, 0);
    req = somaInversos > 0 ? 1 / somaInversos : 0;

    for (let i = 0; i < n; i++) {
      tensoes[i] = vTotal;
      correntes[i] = vTotal / resistores[i];
    }
  } else if (tipo === "misto") {
    // R1 em série com o paralelo de (R2, R3, ..., Rn)
    const r1 = resistores[0];
    let somaInversosParalelo = 0;
    for (let i = 1; i < n; i++) {
      somaInversosParalelo += 1 / resistores[i];
    }
    const rParalelo = somaInversosParalelo > 0 ? 1 / somaInversosParalelo : 0;
    req = r1 + rParalelo;

    const iTotal = req > 0 ? vTotal / req : 0;

    // R1 (em série)
    correntes[0] = iTotal;
    tensoes[0] = iTotal * r1;

    // Bloco em Paralelo (R2 em diante)
    const vParalelo = vTotal - tensoes[0];
    for (let i = 1; i < n; i++) {
      tensoes[i] = vParalelo;
      correntes[i] = vParalelo / resistores[i];
    }
  }

  const iTotal = req > 0 ? vTotal / req : 0;
  const pTotal = vTotal * iTotal;

  // 5. Exibir Resultados
  document.getElementById("vTotal").innerText = vTotal.toFixed(2);
  document.getElementById("req").innerText = req.toFixed(2);
  document.getElementById("iTotal").innerText = iTotal.toFixed(2);
  document.getElementById("pTotal").innerText = pTotal.toFixed(2);

  // Preencher Tabela de Resistores
  const tabela = document.getElementById("tabelaResistores");
  tabela.innerHTML = "";

  for (let i = 0; i < n; i++) {
    const potResistor = tensoes[i] * correntes[i];
    tabela.innerHTML += `
            <tr>
                <td>R${i + 1}</td>
                <td>${resistores[i].toFixed(2)}</td>
                <td>${tensoes[i].toFixed(2)}</td>
                <td>${correntes[i].toFixed(2)}</td>
                <td>${potResistor.toFixed(2)}</td>
            </tr>
        `;
  }

  document.getElementById("painelResultados").style.display = "block";
}

// Inicializar os campos ao carregar a página
window.onload = function () {
  gerarCamposGeradores();
  gerarCamposResistores();
};
