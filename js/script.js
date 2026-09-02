// Guarda a última potência total calculada, usada pela Conta de Luz
let pTotalAtual = 0;

// Cria dynamicamente os campos para digitar a tensão de cada gerador
function gerarCamposGeradores() {
  const qtd = parseInt(document.getElementById("qtdGeradores").value) || 1;
  const container = document.getElementById("containerGeradores");
  container.innerHTML = "";

  for (let i = 1; i <= qtd; i++) {
    container.innerHTML += `
        <div class="campo">
            <label>FEM / Tensão do Gerador ${i} (V):</label>
            <input type="number" class="val-gerador" value="12" min="0" step="any" oninput="desenharDiagrama()">
        </div>
    `;
  }

  desenharDiagrama();
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
                <input type="number" class="val-resistor" value="${10 * i}" min="0.1" step="any" oninput="desenharDiagrama()">
            </div>
        `;
  }

  desenharDiagrama();
}

function calcular() {
  const circuitoMsg = document.getElementById("circuitoMensagem");

  // 1. Somar a Tensão Total dos Geradores em série
  const inputsGeradores = document.querySelectorAll(".val-gerador");
  const valoresGeradores = [];
  inputsGeradores.forEach((input) => valoresGeradores.push(parseFloat(input.value) || 0));

  // 2. Ler os valores dos Resistores
  const inputsResistores = document.querySelectorAll(".val-resistor");
  const resistores = [];
  inputsResistores.forEach((input) =>
    resistores.push(parseFloat(input.value) || 0),
  );

  // Nenhum campo pode ser negativo
  if (valoresGeradores.some((v) => v < 0) || resistores.some((r) => r < 0)) {
    circuitoMsg.textContent = "Valores negativos não são permitidos. Corrija os campos para calcular.";
    circuitoMsg.className = "mensagem-ohm erro";
    document.getElementById("painelResultados").style.display = "none";
    return;
  }
  circuitoMsg.textContent = "";
  circuitoMsg.className = "mensagem-ohm";

  const vTotal = valoresGeradores.reduce((acc, v) => acc + v, 0);
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

  // Atualiza a estimativa de conta de luz com a potência recém-calculada
  pTotalAtual = pTotal;
  atualizarContaLuz();

  desenharDiagrama();
}

// Calcula o consumo e o custo mensal de energia a partir da potência total do circuito
function atualizarContaLuz() {
  const msg = document.getElementById("contaLuzMensagem");
  const precoKwh = parseFloat(document.getElementById("precoKwh").value) || 0;
  const horasDia = parseFloat(document.getElementById("horasDia").value) || 0;
  const diasMes = parseFloat(document.getElementById("diasMes").value) || 0;

  if (precoKwh < 0 || horasDia < 0 || diasMes < 0) {
    msg.textContent = "Valores negativos não são permitidos.";
    msg.className = "mensagem-ohm erro";
    document.getElementById("consumoMensal").innerText = "—";
    document.getElementById("custoMensal").innerText = "—";
    return;
  }
  msg.textContent = "";
  msg.className = "mensagem-ohm";

  const consumoMensal = (pTotalAtual / 1000) * horasDia * diasMes;
  const custoMensal = consumoMensal * precoKwh;

  document.getElementById("consumoMensal").innerText = consumoMensal.toFixed(2);
  document.getElementById("custoMensal").innerText = custoMensal.toFixed(2);
}

// ============================================
// Lei de Ohm — calculadora rápida (V, I, R, P)
// ============================================

function calcularLeiOhm() {
  const campoV = document.getElementById("ohmV");
  const campoI = document.getElementById("ohmI");
  const campoR = document.getElementById("ohmR");
  const campoP = document.getElementById("ohmP");
  const msg = document.getElementById("ohmMensagem");

  const v = campoV.value.trim() === "" ? null : parseFloat(campoV.value);
  const i = campoI.value.trim() === "" ? null : parseFloat(campoI.value);
  const r = campoR.value.trim() === "" ? null : parseFloat(campoR.value);
  const p = campoP.value.trim() === "" ? null : parseFloat(campoP.value);

  const preenchidos = [v, i, r, p].filter((x) => x !== null && !isNaN(x));

  if (preenchidos.some((x) => x < 0)) {
    msg.textContent = "Valores negativos não são permitidos.";
    msg.className = "mensagem-ohm erro";
    return;
  }

  if (preenchidos.length !== 2) {
    msg.textContent = "Preencha exatamente 2 valores para calcular os outros 2.";
    msg.className = "mensagem-ohm erro";
    return;
  }

  try {
    if (v !== null && i !== null) {
      if (i === 0) throw new Error("Corrente não pode ser zero.");
      campoR.value = (v / i).toFixed(4);
      campoP.value = (v * i).toFixed(4);
    } else if (v !== null && r !== null) {
      if (r === 0) throw new Error("Resistência não pode ser zero.");
      campoI.value = (v / r).toFixed(4);
      campoP.value = ((v * v) / r).toFixed(4);
    } else if (v !== null && p !== null) {
      if (v === 0) throw new Error("Tensão não pode ser zero.");
      if (p === 0) throw new Error("Potência não pode ser zero.");
      campoI.value = (p / v).toFixed(4);
      campoR.value = ((v * v) / p).toFixed(4);
    } else if (i !== null && r !== null) {
      campoV.value = (i * r).toFixed(4);
      campoP.value = (i * i * r).toFixed(4);
    } else if (i !== null && p !== null) {
      if (i === 0) throw new Error("Corrente não pode ser zero.");
      campoV.value = (p / i).toFixed(4);
      campoR.value = (p / (i * i)).toFixed(4);
    } else if (r !== null && p !== null) {
      if (r === 0) throw new Error("Resistência não pode ser zero.");
      campoV.value = Math.sqrt(p * r).toFixed(4);
      campoI.value = Math.sqrt(p / r).toFixed(4);
    }
    msg.textContent = "Cálculo realizado com sucesso.";
    msg.className = "mensagem-ohm sucesso";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "mensagem-ohm erro";
  }
}

function limparLeiOhm() {
  document.getElementById("ohmV").value = "";
  document.getElementById("ohmI").value = "";
  document.getElementById("ohmR").value = "";
  document.getElementById("ohmP").value = "";
  const msg = document.getElementById("ohmMensagem");
  msg.textContent = "";
  msg.className = "mensagem-ohm";
}

// ============================================
// Diagrama simples do circuito (SVG)
// ============================================

function criarSvgAberto(largura, altura) {
  return `<svg viewBox="0 0 ${largura} ${altura}" xmlns="http://www.w3.org/2000/svg">`;
}

function svgLinha(x1, y1, x2, y2) {
  return `<line class="fio" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
}

function svgResistor(cx, cy, rectW, rectH, label) {
  const x = cx - rectW / 2;
  const y = cy - rectH / 2;
  return `
    <rect class="resistor-caixa" x="${x}" y="${y}" width="${rectW}" height="${rectH}" rx="4" />
    <text class="resistor-texto" x="${cx}" y="${cy + 4}">${label}</text>
  `;
}

function svgBateria(x, yTop, yBottom, label) {
  const yMeio = (yTop + yBottom) / 2;
  const yPlacaLonga = yMeio - 8;
  const yPlacaCurta = yMeio + 8;
  return `
    ${svgLinha(x, yTop, x, yPlacaLonga)}
    <line class="bateria-linha-longa" x1="${x - 16}" y1="${yPlacaLonga}" x2="${x + 16}" y2="${yPlacaLonga}" />
    <line class="bateria-linha-curta" x1="${x - 9}" y1="${yPlacaCurta}" x2="${x + 9}" y2="${yPlacaCurta}" />
    ${svgLinha(x, yPlacaCurta, x, yBottom)}
    <text class="bateria-texto" x="${x - 30}" y="${yPlacaLonga + 4}">+</text>
    <text class="bateria-texto" x="${x - 30}" y="${yPlacaCurta + 4}">−</text>
    <text class="bateria-texto" x="${x}" y="${yTop - 12}">${label}</text>
  `;
}

function obterValoresResistores() {
  const inputs = document.querySelectorAll(".val-resistor");
  return Array.from(inputs).map((i) => parseFloat(i.value) || 0);
}

function obterTensaoTotal() {
  const inputs = document.querySelectorAll(".val-gerador");
  let total = 0;
  inputs.forEach((i) => (total += parseFloat(i.value) || 0));
  return total;
}

function desenharDiagrama() {
  const tipo = document.getElementById("tipo").value;
  const resistores = obterValoresResistores();
  const n = resistores.length || 1;
  const vTotal = obterTensaoTotal();
  const labelBateria = `${vTotal.toFixed(1)} V`;

  let svg = "";

  if (tipo === "paralelo") {
    svg = desenharParalelo(resistores, labelBateria);
  } else if (tipo === "misto") {
    svg = desenharMisto(resistores, labelBateria);
  } else {
    svg = desenharSerie(resistores, labelBateria);
  }

  document.getElementById("diagramaContainer").innerHTML = svg;
}

function desenharSerie(resistores, labelBateria) {
  const n = resistores.length || 1;
  const yTop = 50;
  const yBottom = 220;
  const xBateria = 45;
  const boxW = 60;
  const boxH = 32;
  const gap = 45;
  const xInicio = 110;
  const xFim = xInicio + n * (boxW + gap) - gap + 30;

  let partes = [criarSvgAberto(xFim + 40, 270)];

  partes.push(svgBateria(xBateria, yTop, yBottom, labelBateria));

  const xDireita = xFim + 20;

  partes.push(svgLinha(xBateria, yTop, xDireita, yTop));
  for (let i = 0; i < n; i++) {
    const cx = xInicio + i * (boxW + gap);
    partes.push(svgResistor(cx, yTop, boxW, boxH, `R${i + 1}`));
  }
  partes.push(svgLinha(xDireita, yTop, xDireita, yBottom));
  partes.push(svgLinha(xDireita, yBottom, xBateria, yBottom));

  partes.push("</svg>");
  return partes.join("");
}

function desenharParalelo(resistores, labelBateria) {
  const n = resistores.length || 1;
  const yTop = 50;
  const yBottom = 220;
  const xBateria = 45;
  const boxW = 30;
  const boxH = 60;
  const espaco = 85;
  const xInicio = 130;
  const xFim = xInicio + (n - 1) * espaco + 40;

  let partes = [criarSvgAberto(xFim + 30, 270)];

  partes.push(svgBateria(xBateria, yTop, yBottom, labelBateria));

  partes.push(svgLinha(xBateria, yTop, xFim, yTop));
  partes.push(svgLinha(xBateria, yBottom, xFim, yBottom));
  partes.push(svgLinha(xFim, yTop, xFim, yBottom));

  for (let i = 0; i < n; i++) {
    const cx = xInicio + i * espaco;
    const cy = (yTop + yBottom) / 2;
    partes.push(svgLinha(cx, yTop, cx, cy - boxH / 2));
    partes.push(svgLinha(cx, cy + boxH / 2, cx, yBottom));
    partes.push(svgResistor(cx, cy, boxW, boxH, `R${i + 1}`));
  }

  partes.push("</svg>");
  return partes.join("");
}

function desenharMisto(resistores, labelBateria) {
  const n = Math.max(resistores.length, 3);
  const nParalelo = n - 1;
  const yTop = 50;
  const yBottom = 220;
  const xBateria = 45;
  const boxW = 60;
  const boxH = 32;
  const xR1 = 130;
  const xParInicio = 245;
  const espacoParalelo = 85;
  const boxParW = 28;
  const boxParH = 55;
  const xFim = xParInicio + (nParalelo - 1) * espacoParalelo + 35;

  let partes = [criarSvgAberto(xFim + 30, 270)];

  partes.push(svgBateria(xBateria, yTop, yBottom, labelBateria));

  // Fio superior: bateria -> R1 -> bloco paralelo -> desce até o fio inferior
  partes.push(svgLinha(xBateria, yTop, xFim, yTop));
  partes.push(svgResistor(xR1, yTop, boxW, boxH, "R1"));

  // Fio inferior: bateria -> direita, fechando o laço
  partes.push(svgLinha(xBateria, yBottom, xFim, yBottom));
  partes.push(svgLinha(xFim, yTop, xFim, yBottom));

  for (let i = 0; i < nParalelo; i++) {
    const cx = xParInicio + i * espacoParalelo;
    const cy = (yTop + yBottom) / 2;
    partes.push(svgLinha(cx, yTop, cx, cy - boxParH / 2));
    partes.push(svgLinha(cx, cy + boxParH / 2, cx, yBottom));
    partes.push(svgResistor(cx, cy, boxParW, boxParH, `R${i + 2}`));
  }

  partes.push("</svg>");
  return partes.join("");
}

// Inicializar os campos ao carregar a página
window.onload = function () {
  gerarCamposGeradores();
  gerarCamposResistores();
  atualizarContaLuz();
};
