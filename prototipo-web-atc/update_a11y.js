const fs = require('fs');
const path = './src/app/page.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Agente
content = content.replace(
  /<label className="block text-\[10px\] font-bold text-slate-500 uppercase mb-1">Agente<\/label>\s+<input \s+list="agentes-list"/,
  `<label htmlFor="agenteIngreso" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente</label>
              <input 
                id="agenteIngreso" name="agenteIngreso"
                list="agentes-list"`
);

// 2. Clientes
content = content.replace(
  /<label className="block text-\[10px\] font-bold text-slate-500 uppercase mb-1">Clientes<\/label>\s+<input \s+value=\{clienteOatc\}/,
  `<label htmlFor="clienteOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clientes</label>
                <input 
                  id="clienteOatc" name="clienteOatc"
                  value={clienteOatc}`
);

// 3. Tipo de demanda
content = content.replace(
  /<label className="block text-\[10px\] font-bold text-slate-500 uppercase mb-1">Tipo de demanda<\/label>\s+<select \s+value=\{demandaOatc\}/,
  `<label htmlFor="demandaOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de demanda</label>
                <select 
                  id="demandaOatc" name="demandaOatc"
                  value={demandaOatc}`
);

// 4. Agente Disponible
content = content.replace(
  /<label className="block text-\[10px\] font-bold text-slate-500 uppercase mb-1">Agente Disponible<\/label>\s+<input \s+list="agentes-list"\s+value=\{agenteOatc\}/,
  `<label htmlFor="agenteOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agente Disponible</label>
                <input 
                  id="agenteOatc" name="agenteOatc"
                  list="agentes-list"
                  value={agenteOatc}`
);

// 5. Tipo de atencion
content = content.replace(
  /<label className="block text-\[10px\] font-bold text-slate-500 uppercase mb-1">Tipo de atenci.*n<\/label>\s+<select \s+value=\{atencionOatc\}/,
  `<label htmlFor="atencionOatc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de atención</label>
                <select 
                  id="atencionOatc" name="atencionOatc"
                  value={atencionOatc}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('a11y fields updated successfully!');
