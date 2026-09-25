import { GenreContent } from '../models/genre-content.models';
import { KIHONJOHO_KISO_RIRON_CONTENT } from '../content/genre-study/kihonjoho-kiso-riron';
import { KIHONJOHO_NETWORK_CONTENT } from '../content/genre-study/kihonjoho-network';
import { KIHONJOHO_COMPUTER_COMPONENTS_CONTENT } from '../content/genre-study/kihonjoho-computer-components';
import { KIHONJOHO_ALGORITHMS_PROGRAMMING_CONTENT } from '../content/genre-study/kihonjoho-algorithms-programming';
import { KIHONJOHO_DATABASE_CONTENT } from '../content/genre-study/kihonjoho-database';
import { KIHONJOHO_SECURITY_CONTENT } from '../content/genre-study/kihonjoho-security';
import { KIHONJOHO_SOFTWARE_CONTENT } from '../content/genre-study/kihonjoho-software';
import { KIHONJOHO_SYSTEM_COMPONENTS_CONTENT } from '../content/genre-study/kihonjoho-system-components';
import { KIHONJOHO_HARDWARE_CONTENT } from '../content/genre-study/kihonjoho-hardware';
import { KIHONJOHO_HUMAN_INTERFACE_CONTENT } from '../content/genre-study/kihonjoho-human-interface';
import { KIHONJOHO_MULTIMEDIA_CONTENT } from '../content/genre-study/kihonjoho-multimedia';
import { KIHONJOHO_SYSTEM_DEVELOPMENT_CONTENT } from '../content/genre-study/kihonjoho-system-development';
import { KIHONJOHO_SW_DEVELOPMENT_TECHNIQUE_CONTENT } from '../content/genre-study/kihonjoho-sw-development-technique';
import { KIHONJOHO_PROJECT_MANAGEMENT_CONTENT } from '../content/genre-study/kihonjoho-project-management';
import { KIHONJOHO_SERVICE_MANAGEMENT_CONTENT } from '../content/genre-study/kihonjoho-service-management';
import { KIHONJOHO_BUSINESS_STRATEGY_CONTENT } from '../content/genre-study/kihonjoho-business-strategy';
import { KIHONJOHO_CORPORATE_LEGAL_CONTENT } from '../content/genre-study/kihonjoho-corporate-legal';
import { KIHONJOHO_SYSTEM_STRATEGY_CONTENT } from '../content/genre-study/kihonjoho-system-strategy';

// ジャンル別まとめページのコンテンツ一覧。今後ジャンルを追加する際はここに登録するだけでよい
// (科目一覧画面への導線・ルーティングは登録されたコンテンツを見て自動的に反映される)。
export const GENRE_CONTENTS: GenreContent[] = [
  KIHONJOHO_KISO_RIRON_CONTENT,
  KIHONJOHO_NETWORK_CONTENT,
  KIHONJOHO_COMPUTER_COMPONENTS_CONTENT,
  KIHONJOHO_ALGORITHMS_PROGRAMMING_CONTENT,
  KIHONJOHO_DATABASE_CONTENT,
  KIHONJOHO_SECURITY_CONTENT,
  KIHONJOHO_SOFTWARE_CONTENT,
  KIHONJOHO_SYSTEM_COMPONENTS_CONTENT,
  KIHONJOHO_HARDWARE_CONTENT,
  KIHONJOHO_HUMAN_INTERFACE_CONTENT,
  KIHONJOHO_MULTIMEDIA_CONTENT,
  KIHONJOHO_SYSTEM_DEVELOPMENT_CONTENT,
  KIHONJOHO_SW_DEVELOPMENT_TECHNIQUE_CONTENT,
  KIHONJOHO_PROJECT_MANAGEMENT_CONTENT,
  KIHONJOHO_SERVICE_MANAGEMENT_CONTENT,
  KIHONJOHO_BUSINESS_STRATEGY_CONTENT,
  KIHONJOHO_CORPORATE_LEGAL_CONTENT,
  KIHONJOHO_SYSTEM_STRATEGY_CONTENT
];

export function findGenreContent(examType: string, genreKey: string): GenreContent | undefined {
  return GENRE_CONTENTS.find((c) => c.examType === examType && c.genreKey === genreKey);
}

export function getGenreContentsForSubject(examType: string): GenreContent[] {
  return GENRE_CONTENTS.filter((c) => c.examType === examType);
}
