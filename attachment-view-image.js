import { css, html, LitElement } from 'lit-element';
import { BaseMixin } from './base-mixin.js';
import { bodyStandardStyles } from '@brightspace-ui/core/components/typography/styles.js';
import { viewStyles } from './attachment-view-styles.js';

export class AttachmentViewImage extends BaseMixin(LitElement) {
	static get properties() {
		return {
			src: { type: String },
			name: { type: String },
			_width: { type: Number },
		};
	}

	static get styles() {
		return [
			bodyStandardStyles,
			viewStyles,
			css`
				:host {
					display: block;
				}

				#content {
					min-width: 202px;
					max-width: 100%;
					cursor: default;
				}

				#info {
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					align-items: center;
					width: 100%;
					box-sizing: border-box;
					padding: 5px 5px 12px 10px;
				}

				:host([dir='rtl']) #info {
					padding: 5px 10px 12px 5px;
				}

				img {
					border-radius: 5px 5px 0 0;
					min-width: 202px;
					max-height: 100%;
					max-width: 100%;
				}

				/* Some of these paddings seem weird but they are taken
					 straight from the old implementation
					 However, there are other weird interactions with the old, very complicated
					 layout that involved many overrides and settings for different attachment
					 types that make the old spacing slightly tighter
				*/
				#name {
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}

				@media (max-width: 615px), (max-device-width: 960px) {
					#info {
						padding: 7px 7px 7px 12px;
					}

					:host([dir='rtl']) #info {
						padding: 7px 12px 7px 7px;
					}
				}
			`,
		];
	}

	constructor() {
		super();
		this._width = 0;
	}

	get name() {
		return this._name || decodeURI(this.src.substr(this.src.lastIndexOf('/') + 1));
	}

	set name(value) {
		const oldValue = this._name;
		this._name = value;
		this.requestUpdate('name', oldValue);
	}

	_loaded(e) {
		this._pendingResolve();
		this._pendingReject = null;
		this._pendingResolve = null;

		if (e.target) {
			this._width = e.target.naturalWidth;
		}
	}

	_errored(e) {
		this._pendingReject();
		this._pendingReject = null;
		this._pendingResolve = null;
		this.dispatchEvent(
			new CustomEvent('error', {
				composed: true,
				bubbles: true,
				detail: e,
			}),
		);
	}

	firstUpdated() {
		const pendingPromise = new Promise((resolve, reject) => {
			this._pendingResolve = resolve;
			this._pendingReject = reject;
		});

		const pendingEvent = new CustomEvent('d2l-pending-state', {
			composed: true,
			bubbles: true,
			detail: { promise: pendingPromise },
		});
		this.dispatchEvent(pendingEvent);
	}

	render() {
		return html`
			<div id="content" style="width: ${this._width}px">
				<img
					src="${this.src}"
					@load="${this._loaded}"
					@error="${this._errored}"
					alt="${this.name}"
				/>
				<div id="info">
					<div id="name" class="d2l-body-standard">${this.name}</div>
					<slot name="button"></slot>
				</div>
			</div>
		`;
	}
}

window.customElements.define('d2l-labs-attachment-view-image', AttachmentViewImage);
