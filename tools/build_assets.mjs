// Regenera todos los recursos: modelos con Blender (y, más adelante, sonidos con Python).
// La ruta de Blender se lee de la variable de entorno BLENDER_PATH.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const POR_DEFECTO = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const BLENDER = process.env.BLENDER_PATH || POR_DEFECTO;

if (!existsSync(BLENDER)) {
  console.error(`No encuentro Blender en "${BLENDER}". Define BLENDER_PATH con la ruta a blender.exe.`);
  process.exit(1);
}

const conPreview = process.argv.includes('--preview');
const scripts = ['tools/blender/build_personajes.py', 'tools/blender/build_enemigos.py', 'tools/blender/build_zona_1_selva.py',
  'tools/blender/build_zona_2_santuario.py', 'tools/blender/build_zona_3_camara.py', 'tools/blender/build_jefe.py'];
// Renders de cada pieza del escenario encuadrada como su dibujo en la hoja de escenarios
if (conPreview) scripts.push('tools/blender/build_escenario_preview.py');
const extra = conPreview ? ['--', '--preview'] : [];

for (const script of scripts) {
  console.log(`\n▶ ${script}`);
  const r = spawnSync(BLENDER, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', script, ...extra], {
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error(`✖ ${script} falló (código ${r.status})`);
    process.exit(r.status ?? 1);
  }
}
console.log('\n▶ tools/audio/audio_synth.py');
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const audio = spawnSync(python, ['tools/audio/audio_synth.py'], { stdio: 'inherit' });
if (audio.status !== 0) {
  console.error('✖ La síntesis de audio falló (necesita Python 3 con numpy)');
  process.exit(audio.status ?? 1);
}
console.log('\n✔ Recursos generados en public/models/ y public/sounds/');
