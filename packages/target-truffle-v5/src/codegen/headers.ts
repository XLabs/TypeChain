import { Contract } from '@xlabs-xyz/typechain'

export function codegenArtifactHeaders(contracts: Contract[]): string {
  return `
  ${contracts.map((c) => `import {${c.name}Contract} from "./${c.name}";`).join('\n')}

  declare global {
    namespace Truffle {
      interface Artifacts {
        ${contracts.map((c) => `require(name: "${c.rawName}"): ${c.name}Contract;`).join('\n')}
      }
    }
  }

  ${contracts.map((c) => `export {${c.name}Contract, ${c.name}Instance} from "./${c.name}";`).join('\n')}
  `
}
