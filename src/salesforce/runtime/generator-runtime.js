"use strict";

import { createGeneratorModule as createGeneratorPureModule } from "../module/generator-module.js";

/**
 * Creates generator helpers with optional dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Generator module API.
 */
export function createGeneratorModule(overrides = {}) {
	return createGeneratorPureModule(overrides);
}

const generatorModule = createGeneratorModule();

export const handleLightningLinkClick =
	generatorModule.handleLightningLinkClick;
export const generateStyleFromSettings =
	generatorModule.generateStyleFromSettings;
export const generateRowTemplate = generatorModule.generateRowTemplate;
export const generateSldsToastMessage =
	generatorModule.generateSldsToastMessage;
export const generateSection = generatorModule.generateSection;
export const generateSldsModal = generatorModule.generateSldsModal;
export const generateRadioButtons = generatorModule.generateRadioButtons;
export const generateOpenOtherOrgModal =
	generatorModule.generateOpenOtherOrgModal;
export const generateSldsFileInput = generatorModule.generateSldsFileInput;
export const generateCheckboxWithLabel =
	generatorModule.generateCheckboxWithLabel;
export const generateUpdateTabModal = generatorModule.generateUpdateTabModal;
export const generateHelpWith_i_popup =
	generatorModule.generateHelpWith_i_popup;
export const generateSldsModalWithTabList =
	generatorModule.generateSldsModalWithTabList;
export const createManageTabRow = generatorModule.createManageTabRow;
export const generateManageTabsModal = generatorModule.generateManageTabsModal;
export const generateReviewSponsorSvgs =
	generatorModule.generateReviewSponsorSvgs;
export const generateTutorialElements =
	generatorModule.generateTutorialElements;
export const sldsConfirm = generatorModule.sldsConfirm;
