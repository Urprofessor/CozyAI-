'use client';

import { originInfo } from '@/lib/origin';
import { CZ } from './ui';

/** Opened by typing the passphrase into the chat input. Says who made this
 *  build and where it is running. */
export function OriginCard({ onClose }: { onClose: () => void }) {
  const o = originInfo();
  return (
    <div className="cz-alert-scrim" onClick={onClose}>
      <div className="cz-origin" role="dialog" aria-label="About this build" onClick={(e) => e.stopPropagation()}>
        <img className="cz-origin__art" src={`${CZ}/icons/cozie_magic_wand_light.png`} alt="" />
        <span className="cz-origin__eyebrow">Made by</span>
        <strong className="cz-origin__tag">{o.tag}</strong>
        <dl className="cz-origin__facts">
          <div>
            <dt>Project</dt>
            <dd>{o.project}</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>{o.build}</dd>
          </div>
          <div>
            <dt>Signature</dt>
            <dd>{o.signature ? `${o.signature.slice(0, 16)}…` : 'Not signed yet'}</dd>
          </div>
          <div>
            <dt>Running on</dt>
            <dd>{o.host || '—'}</dd>
          </div>
        </dl>
        <button type="button" className="cz-origin__close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
