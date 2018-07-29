import NROM from './nrom'

function UnknownMapper() {
  throw new Error('Unknown mapper');
}

const MAPPERS = (new Array(0xff)).fill(null).map(() => UnknownMapper);
MAPPERS[0] = NROM;

export default MAPPERS;
