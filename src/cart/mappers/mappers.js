import NROM from './nrom';
import MMC1 from './mmc1';

function UnknownMapper() {
  throw new Error('Unknown mapper');
}

const MAPPERS = new Array(0xff).fill(null).map(() => UnknownMapper);
MAPPERS[0] = NROM;
MAPPERS[1] = MMC1;

export default MAPPERS;
