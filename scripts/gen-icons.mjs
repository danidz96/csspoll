// Genera los iconos PNG de la PWA a partir del mismo balón del logo.
// Uso: node scripts/gen-icons.mjs
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const GREEN = '#0e7c42'

// Mismo dibujo que el favicon (icono "volleyball" de lucide)
const BALL = `
  <path d='M11 7a16 16 20 0 1 10.98 4.362'/>
  <path d='M12 12a13 13 0 0 1-8.66 5'/>
  <path d='M16.83 13.634a16 16 0 0 1-9.267 7.328'/>
  <path d='M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10'/>
  <path d='M8.17 15.366a16 16 0 0 1-1.713-11.69'/>
  <circle cx='12' cy='12' r='10'/>
`

/**
 * Cuadrado verde con el balón centrado.
 * ratio: fracción del lado que ocupa el balón. rounding: radio de esquina (0 = a sangre).
 */
function iconSVG(size, { ratio = 0.72, rounding = 0.22 } = {}) {
  const ball = size * ratio
  const offset = (size - ball) / 2
  const scale = ball / 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${(size * rounding).toFixed(1)}" fill="${GREEN}"/>
    <g transform="translate(${offset.toFixed(1)} ${offset.toFixed(1)}) scale(${scale.toFixed(4)})"
       fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BALL}</g>
  </svg>`
}

async function render(file, size, opts) {
  await sharp(Buffer.from(iconSVG(size, opts))).png().toFile(file)
  console.log(`✓ ${file}`)
}

await mkdir('public/icons', { recursive: true })
// Icono normal: cuadrado redondeado con el balón grande (como el favicon)
await render('public/icons/icon-192.png', 192)
await render('public/icons/icon-512.png', 512)
// Maskable (Android): a sangre y con margen extra dentro de la zona segura
await render('public/icons/icon-maskable-512.png', 512, { ratio: 0.58, rounding: 0 })
// iOS aplica su propio redondeo: a sangre, sin transparencia
await render('public/apple-touch-icon.png', 180, { ratio: 0.68, rounding: 0 })
