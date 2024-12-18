import * as fs from 'fs'
import { sync as mkdirp } from 'mkdirp'
import { relative } from 'path'
import * as prettier from 'prettier'

import { debug } from '../utils/debug'
import { detectInputsRoot } from '../utils/files'
import { findTarget } from './findTarget'
import { loadFileDescriptions, processOutput, skipEmptyAbis } from './io'
import { CodegenConfig, Config, FileDescription, PublicConfig, Services } from './types'
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
  const config: Config = {
    flags: DEFAULT_FLAGS,
    inputDir: detectInputsRoot(allFiles),
    ...publicConfig,
    allFiles,
    filesToProcess: skipEmptyAbis(publicConfig.filesToProcess),
  }
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

export async function runTypeChainInMemory(publicConfig: Omit<PublicConfig, "filesToProcess">, fileDescriptions: FileDescription[]): Promise<Result> {
  
  const allFiles = (fileDescriptions.filter((fd) => extractAbi(fd.contents).length !== 0)).map(fd => fd.path)

  // skip empty paths
  const config: Config = {
    flags: DEFAULT_FLAGS,
    inputDir: detectInputsRoot(allFiles),
    ...publicConfig,
    allFiles,
    filesToProcess: [],
  }

  const services: Services = {
    fs,
    prettier: { format: (s: string) => { return s } } as typeof prettier,
    mkdirp,
  }
  let filesGenerated = 0

  const target = findTarget(config)

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
