import * as fs from 'fs'
import { sync as mkdirp } from 'mkdirp'
import { relative } from 'path'
import * as prettier from 'prettier'

import { debug } from '../utils/debug'
import { detectInputsRoot } from '../utils/files'
import { findTarget } from './findTarget'
import { loadFileDescriptions, processOutput, skipEmptyAbis } from './io'
import { CliConfig, CodegenConfig, FileDescription, InMemoryConfig, PublicConfig, PublicInMemoryConfig, Services, TypeChainTarget } from './types'
import { extractAbi } from '../parser/abiParser'

interface Result {
  filesGenerated: number
}

export const DEFAULT_FLAGS: CodegenConfig = {
  alwaysGenerateOverloads: false,
  discriminateTypes: false,
  tsNocheck: false,
  environment: undefined,
}

export async function runTypeChain(publicConfig: PublicConfig): Promise<Result> {
  const allFiles = skipEmptyAbis(publicConfig.allFiles)
  if (allFiles.length === 0) {
    return {
      filesGenerated: 0,
    }
  }

  // skip empty paths
  const config = {
    flags: DEFAULT_FLAGS,
    inputDir: detectInputsRoot(allFiles),
    ...publicConfig,
    allFiles,
    filesToProcess: skipEmptyAbis(publicConfig.filesToProcess),
  } satisfies CliConfig
  const services: Services = {
    fs,
    prettier,
    mkdirp,
  }
  let filesGenerated = 0

  const target = findTarget(config)

  const fileDescriptions = loadFileDescriptions(services, config.filesToProcess)

  debug('Executing beforeRun()')
  filesGenerated += processOutput(services, config, await target.beforeRun())

  debug('Executing beforeRun()')
  for (const fd of fileDescriptions) {
    debug(`Processing ${relative(config.cwd, fd.path)}`)

    filesGenerated += processOutput(services, config, await target.transformFile(fd))
  }

  debug('Running afterRun()')
  filesGenerated += processOutput(services, config, await target.afterRun())

  return {
    filesGenerated,
  }
}

export async function runTypeChainInMemory(publicConfig: PublicInMemoryConfig, fileDescriptions: FileDescription[], target: TypeChainTarget): Promise<Result> {
  
  const allFiles = (fileDescriptions.filter((fd) => extractAbi(fd.contents).length !== 0)).map(fd => fd.path)

  const config = {
    flags: DEFAULT_FLAGS,
    inputDir: detectInputsRoot(allFiles),
    ...publicConfig,
    allFiles,
  } satisfies InMemoryConfig

  const services: Services = {
    fs,
    prettier: { format: (s: string) => s } as typeof prettier,
    mkdirp,
  }
  let filesGenerated = 0

  debug('Executing beforeRun()')
  filesGenerated += processOutput(services, config, await target.beforeRun())

  debug('Executing beforeRun()')
  for (const fd of fileDescriptions) {
    debug(`Processing ${relative(config.cwd, fd.path)}`)

    filesGenerated += processOutput(services, config, await target.transformFile(fd))
  }

  debug('Running afterRun()')
  filesGenerated += processOutput(services, config, await target.afterRun())

  return {
    filesGenerated,
  }
}
