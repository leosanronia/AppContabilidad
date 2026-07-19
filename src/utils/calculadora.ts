// Evalua expresiones aritmeticas simples (+ - * / y parentesis) como en Excel.
//
// SEGURIDAD: no se usa eval() ni new Function(). El texto se analiza caracter
// por caracter con un parser propio (descenso recursivo), asi que nada de lo
// que escriba el usuario llega a ejecutarse como codigo.

class Analizador {
  private texto: string
  private pos = 0

  constructor(texto: string) {
    this.texto = texto
  }

  private ver(): string | undefined {
    return this.texto[this.pos]
  }

  private consumir(): string {
    return this.texto[this.pos++]
  }

  enElFinal(): boolean {
    return this.pos >= this.texto.length
  }

  // expresion := termino (('+' | '-') termino)*
  expresion(): number {
    let valor = this.termino()
    for (;;) {
      const c = this.ver()
      if (c === '+') {
        this.consumir()
        valor += this.termino()
      } else if (c === '-') {
        this.consumir()
        valor -= this.termino()
      } else {
        return valor
      }
    }
  }

  // termino := factor (('*' | '/') factor)*
  private termino(): number {
    let valor = this.factor()
    for (;;) {
      const c = this.ver()
      if (c === '*') {
        this.consumir()
        valor *= this.factor()
      } else if (c === '/') {
        this.consumir()
        const divisor = this.factor()
        if (divisor === 0) throw new Error('No se puede dividir entre cero.')
        valor /= divisor
      } else {
        return valor
      }
    }
  }

  // factor := ('+' | '-') factor | '(' expresion ')' | numero
  private factor(): number {
    const c = this.ver()
    if (c === undefined) throw new Error('La operación quedó incompleta.')
    if (c === '+') {
      this.consumir()
      return this.factor()
    }
    if (c === '-') {
      this.consumir()
      return -this.factor()
    }
    if (c === '(') {
      this.consumir()
      const valor = this.expresion()
      if (this.ver() !== ')') throw new Error('Falta cerrar un paréntesis.')
      this.consumir()
      return valor
    }
    return this.numero()
  }

  private numero(): number {
    let texto = ''
    let puntos = 0
    for (;;) {
      const c = this.ver()
      if (c === undefined) break
      if (c >= '0' && c <= '9') {
        texto += this.consumir()
      } else if (c === '.') {
        puntos += 1
        if (puntos > 1) throw new Error('Número inválido: tiene dos puntos.')
        texto += this.consumir()
      } else {
        break
      }
    }
    if (texto === '' || texto === '.') throw new Error('Falta un número.')
    const valor = Number(texto)
    if (Number.isNaN(valor)) throw new Error('Número inválido.')
    return valor
  }
}

// Evalua lo que el usuario escribio y devuelve el monto resultante.
// Lanza Error con un mensaje claro si la expresion no es valida.
export function evaluarMonto(entrada: string): number {
  const limpio = entrada.replace(/\s/g, '').replace(/,/g, '.')
  if (limpio === '') throw new Error('Escribe un valor.')
  if (!/^[0-9+\-*/().]+$/.test(limpio)) {
    throw new Error('Solo se permiten números y los signos + - * / ( )')
  }

  const analizador = new Analizador(limpio)
  const valor = analizador.expresion()
  if (!analizador.enElFinal()) throw new Error('No se entiende la operación.')
  if (!Number.isFinite(valor)) throw new Error('El resultado no es válido.')

  // La base guarda numeric(14,2): se redondea a 2 decimales.
  return Math.round(valor * 100) / 100
}
