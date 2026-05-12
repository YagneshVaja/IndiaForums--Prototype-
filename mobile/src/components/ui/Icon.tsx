import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

// Semantic name -> underlying glyph. When swapping to a custom icon set later,
// only this map changes; call sites stay as <Icon name="like" />.
const NAME_MAP = {
  back: 'chevron-back',
  forward: 'chevron-forward',
  up: 'chevron-up',
  down: 'chevron-down',
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',
  arrowDown: 'arrow-down',
  arrowUndo: 'arrow-undo',
  close: 'close',
  closeCircle: 'close-circle',
  menu: 'menu',

  like: 'heart-outline',
  liked: 'heart',
  bookmark: 'bookmark-outline',
  bookmarked: 'bookmark',
  share: 'share-social-outline',
  comment: 'chatbubble-outline',
  comments: 'chatbubbles-outline',
  commentActive: 'chatbubble-ellipses',
  commentActiveOutline: 'chatbubble-ellipses-outline',
  reply: 'return-up-back-outline',
  send: 'send',
  sendOutline: 'send-outline',
  search: 'search',
  edit: 'create-outline',
  delete: 'trash-outline',
  copy: 'copy-outline',
  flag: 'flag-outline',
  pin: 'pin',
  add: 'add',
  addCircle: 'add-circle',
  addCircleOutline: 'add-circle-outline',
  attach: 'attach',
  save: 'save-outline',
  open: 'open-outline',

  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  checkCircleOutline: 'checkmark-circle-outline',
  alert: 'alert-circle',
  alertOutline: 'alert-circle-outline',
  info: 'information-circle-outline',
  helpCircle: 'help-circle',

  user: 'person-outline',
  userFilled: 'person',
  users: 'people-outline',
  settings: 'settings-outline',
  notifications: 'notifications-outline',
  mail: 'mail-outline',
  mailOpen: 'mail-open-outline',
  mailUnread: 'mail-unread-outline',

  image: 'image-outline',
  images: 'images-outline',
  imagesFilled: 'images',
  video: 'film-outline',
  videoFilled: 'film',
  document: 'document-text-outline',
  link: 'link-outline',
  folder: 'folder-outline',
  albums: 'albums-outline',
  book: 'book',
  bookOutline: 'book-outline',
  layers: 'layers-outline',
  play: 'play',
  tv: 'tv',
  tvOutline: 'tv-outline',
  list: 'list',

  star: 'star',
  trophy: 'trophy',
  fire: 'flame',
  flash: 'flash',
  thumbsUp: 'thumbs-up-outline',
  thumbsUpFilled: 'thumbs-up',

  globe: 'globe-outline',
  globeFilled: 'globe',
  calendar: 'calendar-outline',
  clock: 'time-outline',
  location: 'location-outline',
  lock: 'lock-closed',
  unlock: 'lock-open-outline',
  shield: 'shield-outline',
  eye: 'eye-outline',

  logoFacebook: 'logo-facebook',
  logoTwitter: 'logo-twitter',
  logoWhatsapp: 'logo-whatsapp',
  logoMicrosoft: 'logo-microsoft',
} as const satisfies Record<string, IoniconsName>;

export type IconName = keyof typeof NAME_MAP;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof Ionicons>['style'];
}

export default function Icon({ name, size = 20, color, style }: Props) {
  return <Ionicons name={NAME_MAP[name]} size={size} color={color} style={style} />;
}

// Escape hatch for one-off icons that don't deserve a semantic alias yet.
// Prefer adding to NAME_MAP. Re-exported here so call sites don't have to import
// @expo/vector-icons directly and the wrapper stays the single source of truth.
export { Ionicons as RawIcon };
