import '@brightspace-ui/core/components/button/button-icon.js';
import { announce } from '@brightspace-ui/core/helpers/announce.js';
import { css, html, LitElement } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map.js';
import { PendingContainerMixin } from 'siren-sdk/src/mixin/pending-container-mixin.js';
import { defaultLink, unfurl } from '../helpers/attachment-utils.js';
import { BaseMixin } from '../mixins/base-mixin.js';
import { RequestProviderMixin } from '../mixins/request-provider-mixin.js';
import { AttachmentContent } from './attachment-content.js';
import './attachment-embed.js';
import { AttachmentFile } from './attachment-file.js';
import { AttachmentImage } from './attachment-image.js';
import { AttachmentLti } from './attachment-lti.js';
import './attachment-url.js';
import './attachment-video.js';
import './views/attachment-view-deleted.js';

const baseUrl = import.meta.url;

export class Attachment extends RequestProviderMixin(PendingContainerMixin(BaseMixin(LitElement))) {
	static get properties() {
		return {
			attachment: { type: Object },
			attachmentId: { type: String },
			baseHref: { type: String },
			creating: { type: Boolean },
			editing: { type: Boolean },
			immersive: { type: Boolean },
			permission: { type: Object },
			deleted: {type: Boolean },
			maxheight: { type: Number },
		};
	}

	static get styles() {
		return css`
			:host {
				display: block;
			}

			div.display {
				cursor: pointer;
			}

			img {
				/* width: 100%; */
				height: 156px;
				display: block;
			}

			@media (max-width: 615px), (max-device-width: 960px) {
				img {
					width: 100%;
					height: 144px;
				}
			}
		`;
	}

	static _getSimpleTemplate(attachment) {
		let template;
		template = AttachmentFile.getTemplate(attachment);
		template = template || AttachmentLti.getTemplate(attachment);
		template = template || AttachmentContent.getTemplate(attachment);
		template = template || AttachmentImage.getTemplate(attachment);
		return template;
	}

	static _getUnfurledTemplate(type) {
		switch (type) {
			case 'video':
				return 'video';
			case 'embed':
				return 'embed';
			default:
				return 'url';
		}
	}

	constructor() {
		super();
		this._hasPendingChildren = true;
	}

	get permission() {
		return this._permission && this._permission.canAccess ? this._permission : {
			canAccess: () => true
		};
	}

	set permission(value) {
		const oldValue = this._permission;
		if (oldValue !== value) {
			this._permission = value;
			this.requestUpdate('permission');
		}
	}

	async _callUnfurl(attachment) {
		let result;
		const unfurlCache = this.requestProvider('d2l-provider-unfurl-cache');
		const url = defaultLink(attachment.url).href;
		if (unfurlCache) {
			result = unfurlCache().get(url);
			if (result) {
				return result;
			}
		}

		let unfurlApiEndpoint = this.requestProvider('d2l-provider-unfurl-api-endpoint');
		if (!unfurlApiEndpoint) {
			unfurlApiEndpoint = () => '';
		}

		let checkTrustedSiteFn = this.requestProvider('d2l-provider-trusted-site-fn');
		if (!checkTrustedSiteFn) {
			checkTrustedSiteFn = () => () => false;
		}

		result = await unfurl(unfurlApiEndpoint(), checkTrustedSiteFn(), attachment);

		if (result && unfurlCache) {
			unfurlCache().set(url, result);
		}
		return result;
	}

	async _unfurl(attachment) {
		try {
			this._unfurlResult = await this._callUnfurl(attachment);
			if (!this._unfurlResult) {
				this._unfurlResult = {
					url: defaultLink(attachment.url).href,
				};
			}
			this._handleUnfurled(this._unfurlResult);
			this._handleUntrusted(this._unfurlResult);

			this._template = Attachment._getUnfurledTemplate(this._unfurlResult.type);
			// TODO - notify name updated
			// this._name = attachment.name || unfurled.title || unfurled.url;
		} finally {
			this.requestUpdate();
		}
	}

	_handleUntrusted(unfurlResult) {
		if (!unfurlResult.untrusted) {
			return;
		}

		const untrustedEvent = new CustomEvent('d2l-attachment-untrusted', {
			composed: true,
			bubbles: true,
			detail: this.attachmentId,
		});
		this.dispatchEvent(untrustedEvent);
	}

	_handleUnfurled(unfurlResult) {
		const untrustedEvent = new CustomEvent('d2l-attachment-unfurled', {
			composed: true,
			bubbles: true,
			detail: unfurlResult,
		});
		this.dispatchEvent(untrustedEvent);
	}

	_removeAttachment() {
		const removeEvent = new CustomEvent('d2l-attachment-removed', {
			composed: true,
			bubbles: true,
			detail: this.attachmentId,
		});
		this.dispatchEvent(removeEvent);

		announce(this.localize('aria_removed_attachment', 'attachment_name', this.attachment.name));
	}

	_immersiveAttachment() {
		const immersiveEvent = new CustomEvent('d2l-attachment-immersive', {
			composed: true,
			bubbles: true,
			detail: this.attachment,
		});
		this.dispatchEvent(immersiveEvent);
	}

	get _attachmentTemplate() {
		return this[`_${this._template}Template`];
	}

	get _fileTemplate() {
		return html`
			<d2l-labs-attachment-file
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.permission="${this.permission}"
				baseHref="${this.baseHref}"
			>
				${this._removeButtonTemplate}
			</d2l-labs-attachment-file>
		`;
	}

	get _ltiTemplate() {
		return html`
			<d2l-labs-attachment-lti
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.permission="${this.permission}"
				?immersive="${this.immersive}"
				baseHref="${this.baseHref}"
				maxheight="${this.maxheight}"
			>
				${this._removeButtonTemplate}
				${this._immersiveButtonTemplate}
			</d2l-labs-attachment-lti>
		`;
	}

	get _contentTemplate() {
		return html`
			<d2l-labs-attachment-content
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.permission="${this.permission}"
				baseHref="${this.baseHref}"
			>
				${this._removeButtonTemplate}
			</d2l-labs-attachment-content>
		`;
	}

	get _imageTemplate() {
		return html`
			<d2l-labs-attachment-image
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.permission="${this.permission}"
			>
				${this._removeButtonTemplate}
			</d2l-labs-attachment-image>
		`;
	}

	get _videoTemplate() {
		return html`
			<d2l-labs-attachment-video
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.unfurlResult="${this._unfurlResult}"
				.permission="${this.permission}"
			>
				${this._removeButtonTemplate}
			</d2l-labs-attachment-video>
		`;
	}

	get _embedTemplate() {
		return html`
			<d2l-labs-attachment-embed
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.unfurlResult="${this._unfurlResult}"
				.permission="${this.permission}"
				?immersive="${this.immersive}"
				maxheight="${this.maxheight}"
			>
				${this._removeButtonTemplate}
				${this._immersiveButtonTemplate}
			</d2l-labs-attachment-embed>
		`;
	}

	get _urlTemplate() {
		return html`
			<d2l-labs-attachment-url
				id="attachment"
				.attachment="${this.attachment}"
				.editing="${this.editing}"
				.unfurlResult="${this._unfurlResult}"
				.permission="${this.permission}"
			>
				${this._removeButtonTemplate}
			</d2l-labs-attachment-url>
		`;
	}

	get _removeButtonTemplate() {
		return this.editing ? html`
				<d2l-button-icon
					slot="button"
					icon="tier1:close-small"
					text="${this.localize('aria_remove_attachment', 'attachment_name', this.attachment.name)}"
					@click="${this._removeAttachment}"
				></d2l-button-icon>
			` : html``;
	}

	get _immersiveButtonTemplate() {
		return !this.editing	? html`
			<d2l-button-icon
				slot="button"
				icon="tier1:fullscreen"
				text="${this.localize('open_in_fullscreen')}"
				@click="${this._immersiveAttachment}"
			></d2l-button-icon>
		` : html``;
	}

	get _deletedTemplate() {
		if (this.deleted) {
			return html`
				<d2l-labs-attachment-view-deleted
					.attachment="${this.attachment}"
					attachmentId="${this.attachmentId}"
				>
				</d2l-labs-attachment-view-deleted>
			`;
		}
		return html``;
	}

	get _skeletonTemplate() {
		return html`
			${this._hasPendingChildren ? html`
				<img
					src="${this.resolveUrl('../icons/link-skeleton.svg', baseUrl)}"
					alt="${this.localize('link_thumbnail')}"
				/>
			` : html``}
		`;
	}

	get _standardTemplate() {
		return html`
			${this._skeletonTemplate}
			<div class="${classMap({ display: !this.editing })}" ?hidden="${this._hasPendingChildren || this.deleted}">
				${this._attachmentTemplate}
			</div>
		`;
	}

	render() {
		return html`
			${this._deletedTemplate}
			${this._standardTemplate}
		`;
	}

	updated(changedProperties) {
		super.updated(changedProperties);

		if (changedProperties.has('attachment') && this.attachment) {
			this._template = Attachment._getSimpleTemplate(this.attachment);
			if (this._template === null) {
				this._unfurl(this.attachment);
			} else {
				this.requestUpdate();
			}
		}

		if (changedProperties.has('deleted') && this.deleted === false) {
			const attachment = this.shadowRoot.getElementById('attachment');
			if (attachment) {
				attachment.focus();
			}
		}
	}
}

window.customElements.define('d2l-labs-attachment', Attachment);
