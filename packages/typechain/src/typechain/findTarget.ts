import _, { compact } from 'lodash'

import { debug } from '../utils/debug'
import { ensureAbsPath } from '../utils/files/ensureAbsPath'
import { tryRequire } from '../utils/modules'
import { CliConfig, TypeChainTarget } from './types'

export function findTarget(config: CliConfig): TypeChainTarget {
  const target = config.target
  if (!target) {
    throw new Error(`Please provide --target parameter!`)
  }

  const possiblePaths = [
    `@xlabs-xyz/typechain-${target}`, // external module
    `typechain-target-${target}`, // external module
    ensureAbsPath(target), // path
  ]

  const moduleInfo = _(possiblePaths).compact().map(tryRequire).compact().first()

  if (!moduleInfo || !moduleInfo.module.default) {
    throw new Error(
      `Couldn't find ${config.target}. Tried loading: ${compact(possiblePaths).join(
        ', ',
      )}.\nPerhaps you forgot to install @xlabs-xyz/typechain-${target}?`,
    )
  }

  debug('Plugin found at', moduleInfo.path)

  return new moduleInfo.module.default(config)
}
