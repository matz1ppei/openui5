/*!
 * ${copyright}
 */

sap.ui.define([
	"sap/ui/core/CustomData"
], function(
	CustomData // needs to be preloaded
) {
	"use strict";

	/**
	 * Provides functionality to handle flex related CustomData
	 * A CustomData object will be added to the control with the key depending on the success of the applyChange method.
	 * Possible keys are:
	 * 	- 'sap.ui.fl.appliedChanges.<sChangeId>'
	 * 	- 'sap.ui.fl.failedChanges.js.<sChangeId>'
	 * 	- 'sap.ui.fl.failedChanges.xml.<sChangeId>'
	 * 	- 'sap.ui.fl.notApplicableChanges.<sChangeId>'
	 * The value for applied changes is the serialized revert data, for every other its just 'true'
	 * notApplicable describes a state where the change could not be applied, but it's still fine
	 * and doesn't harm the other changes (e.g. duplicate addFields change)
	 * The CustomData is also persisted in the view cache if it's active
	 *
	 * @alias sap.ui.fl.FlexCustomData
	 * @experimental Since 1.61.0
	 * @author SAP SE
	 * @version ${version}
	 */
	var FlexCustomData = {};

	FlexCustomData.appliedChangesCustomDataKey = "sap.ui.fl.appliedChanges";
	FlexCustomData.failedChangesCustomDataKeyJs = "sap.ui.fl.failedChanges.js";
	FlexCustomData.failedChangesCustomDataKeyXml = "sap.ui.fl.failedChanges.xml";
	FlexCustomData.notApplicableChangesCustomDataKey = "sap.ui.fl.notApplicableChanges";

	/**
	 * Checks the custom data of the provided control for applied changes and returns the value or undefined
	 *
	 * @param {sap.ui.core.Control} oControl The Control that should be checked
	 * @param {sap.ui.fl.Change} oChange - Change instance
	 * @param {sap.ui.core.util.reflection.BaseTreeModifier} oModifier The control tree modifier
	 *
	 * @returns {string} Returns the custom data or undefined
	 */
	FlexCustomData.getAppliedCustomDataValue = function(oControl, oChange, oModifier) {
		var mCustomData = this._getCustomData(oControl, oModifier, this._getCustomDataKey(oChange, FlexCustomData.appliedChangesCustomDataKey));
		return mCustomData.customDataValue;
	};

	/**
	 * Checks the custom data of the provided control. If there is custom data value it gets parsed and returned as object
	 *
	 * @param {sap.ui.core.Control} oControl The Control that should be checked
	 * @param {sap.ui.fl.Change} oChange - Change instance
	 * @param {sap.ui.core.util.reflection.BaseTreeModifier} oModifier The control tree modifier
	 *
	 * @returns {object} Returns the revert data from the custom data as object or undefined
	 */
	FlexCustomData.getParsedRevertDataFromCustomData = function(oControl, oChange, oModifier) {
		var sCustomDataValue = this.getAppliedCustomDataValue(oControl, oChange, oModifier);
		return sCustomDataValue && JSON.parse(sCustomDataValue);
	};

	/**
	 * Checks the custom data of the provided control and returns true if the failed change key is there
	 *
	 * @param {sap.ui.core.Control} oControl The Control that should be checked
	 * @param {sap.ui.fl.Change} oChange - Change instance
	 * @param {sap.ui.core.util.reflection.BaseTreeModifier} oModifier The control tree modifier
	 *
	 * @returns {boolean} Returns true if the custom data is there
	 */
	FlexCustomData.hasFailedCustomDataJs = function(oControl, oChange, oModifier) {
		var mCustomData = this._getCustomData(oControl, oModifier, this._getCustomDataKey(oChange, FlexCustomData.failedChangesCustomDataKeyJs));
		return !!mCustomData.customDataValue;
	};

	/**
	 * Adds applied custom data to the control. The value of the custom data is, depending on if the change is revertible,
	 * either the revert data of the change (stringified and '{' and '}' escaped) of simply 'true'
	 *
	 * @param {sap.ui.core.Control} oControl The Control that should be checked
	 * @param {sap.ui.fl.Change} oChange Change instance
	 * @param {object} mPropertyBag propertyBag
	 * @param {object} mPropertyBag.view The view to process
	 * @param {object} mPropertyBag.modifier Polymorph reuse operations handling the changes on the given view type
	 * @param {object} mPropertyBag.appDescriptor App descriptor containing the metadata of the current application
	 * @param {object} mPropertyBag.appComponent Component instance that is currently loading
	 * @param {boolean} bRevertible true if the change is revertible
	 */
	FlexCustomData.addAppliedCustomData = function(oControl, oChange, mPropertyBag, bRevertible) {
		var sCustomDataValue;
		var sCustomDataKey = this._getCustomDataKey(oChange, FlexCustomData.appliedChangesCustomDataKey);
		if (bRevertible) {
			// '{' and '}' have to be escaped in order to correctly create the custom data from the view cache. Same effect as unbindProperty during runtime
			sCustomDataValue = this._escapeCurlyBracketsInString(JSON.stringify(oChange.getRevertData()));
		} else {
			sCustomDataValue = "true";
		}

		this._writeCustomData(oControl, sCustomDataKey, sCustomDataValue, mPropertyBag);
	};

	/**
	 * Adds failed custom data to the control. The value is just 'true'
	 *
	 * @param {sap.ui.core.Control} oControl The Control that should be checked
	 * @param {sap.ui.fl.Change} oChange Change instance
	 * @param {object} mPropertyBag propertyBag
	 * @param {object} mPropertyBag.view The view to process
	 * @param {object} mPropertyBag.modifier Polymorph reuse operations handling the changes on the given view type
	 * @param {object} mPropertyBag.appDescriptor App descriptor containing the metadata of the current application
	 * @param {object} mPropertyBag.appComponent Component instance that is currently loading
	 * @param {string} sIdentifier identifier which custom data key has to be used
	 */
	FlexCustomData.addFailedCustomData = function(oControl, oChange, mPropertyBag, sIdentifier) {
		var sCustomDataKey = this._getCustomDataKey(oChange, sIdentifier);
		this._writeCustomData(oControl, sCustomDataKey, "true", mPropertyBag);
	};

	/**
	 * Destroys the applied custom data for the given control
	 *
	 * @param {sap.ui.core.Control} oControl The Control that should be checked
	 * @param {sap.ui.fl.Change} oChange - Change instance
	 * @param {sap.ui.core.util.reflection.BaseTreeModifier} oModifier The control tree modifier
	 */
	FlexCustomData.destroyAppliedCustomData = function(oControl, oChange, oModifier) {
		var sKey = this._getCustomDataKey(oChange, FlexCustomData.appliedChangesCustomDataKey);
		var mCustomData = this._getCustomData(oControl, oModifier, sKey);
		if (mCustomData.customData) {
			oModifier.destroy(mCustomData.customData);
		}
	};

	/**
	 * Returns the identifier which custom data key has to be used depending on the success, the error and the modifier.
	 * The correct key is determined like this:
	 * 	1. if bSuccess is true: FlexCustomData.appliedChangesCustomDataKey
	 * 	2. if bError is false: FlexCustomData.notApplicableChangesCustomDataKey
	 * 	3. if bXmlModifier is true: FlexCustomData.failedChangesCustomDataKeyXml
	 * 	4. FlexCustomData.failedChangesCustomDataKeyJs
	 *
	 * @param {boolean} bSuccess true if the change has been applied successfully
	 * @param {boolean} bError true if the change has thrown an error
	 * @param {boolean} bXmlModifier true if the change has been applied in XML
	 *
	 * @returns {string} Returns the correct identifier as a string
	 */
	FlexCustomData.getCustomDataIdentifier = function(bSuccess, bError, bXmlModifier) {
		if (bSuccess) {
			return FlexCustomData.appliedChangesCustomDataKey;
		}
		if (!bError) {
			return FlexCustomData.notApplicableChangesCustomDataKey;
		}
		if (bXmlModifier) {
			return FlexCustomData.failedChangesCustomDataKeyXml;
		}
		return FlexCustomData.failedChangesCustomDataKeyJs;
	};

	FlexCustomData._escapeCurlyBracketsInString = function(sText) {
		return sText.replace(/{/g, '\\\{').replace(/}/g, '\\\}');
	};

	FlexCustomData._getCustomDataKey = function(oChange, sIdentifier) {
		return sIdentifier + "." + oChange.getId();
	};

	FlexCustomData._writeCustomData = function(oControl, sKey, sValue, mPropertyBag) {
		var mCustomData = this._getCustomData(oControl, mPropertyBag.modifier, sKey);

		if (!mCustomData.customData) {
			this._createAndAddCustomDataControl(oControl, mPropertyBag, sKey, sValue);
		} else {
			mPropertyBag.modifier.setProperty(mCustomData.customData, "value", sValue);
		}
	};

	FlexCustomData._createAndAddCustomDataControl = function(oControl, mPropertyBag, sCustomDataKey, sValue) {
		var oModifier = mPropertyBag.modifier,
			oView = mPropertyBag.view,
			oComponent = mPropertyBag.appComponent;

		var oCustomData = oModifier.createControl("sap.ui.core.CustomData", oComponent, oView, undefined, undefined, false);
		oModifier.setProperty(oCustomData, "key", sCustomDataKey);
		oModifier.setProperty(oCustomData, "value", sValue);
		oModifier.insertAggregation(oControl, "customData", oCustomData, 0, oView);
		return oCustomData;
	};

	FlexCustomData._getCustomData = function(oControl, oModifier, sCustomDataKey) {
		var aCustomData = oModifier.getAggregation(oControl, "customData") || [];
		var oReturn = {};
		aCustomData.some(function (oCustomData) {
			var sKey = oModifier.getProperty(oCustomData, "key");
			if (sKey === sCustomDataKey) {
				oReturn.customData = oCustomData;
				oReturn.customDataValue = oModifier.getProperty(oCustomData, "value");
				return true;
			}
		});
		return oReturn;
	};

	return FlexCustomData;
}, /* bExport= */true);