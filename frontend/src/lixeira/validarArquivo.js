// Checagem no navegador antes de enviar (HU-03). O servidor repete a checagem (413/400).
export const LIMITE_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const O_QUE_FAZER = "Envie em JPG ou PNG, até 5 MB.";

export function validarArquivo(file) {
  if (!file) return { ok: false, mensagem: `Nenhuma foto foi escolhida. ${O_QUE_FAZER}` };
  // O Windows às vezes manda HEIC com tipo vazio: olha também a extensão.
  // shortcut: confia na extensão quando o tipo vem vazio; o servidor confere o conteúdo de verdade.
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "")) {
    return { ok: false, mensagem: `Fotos em HEIC (padrão do iPhone) não são aceitas. ${O_QUE_FAZER}` };
  }
  // Tipo vazio (alguns sistemas não informam): decide pela extensão.
  const aceito = file.type ? TIPOS_ACEITOS.includes(file.type) : /\.(jpe?g|png|webp)$/i.test(file.name || "");
  if (!aceito) {
    return { ok: false, mensagem: `Esse arquivo não é uma foto aceita. ${O_QUE_FAZER}` };
  }
  if (file.size > LIMITE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
    return { ok: false, mensagem: `A foto passa de 5 MB (tem ${mb} MB). Envie uma menor, em JPG ou PNG.` };
  }
  return { ok: true };
}
