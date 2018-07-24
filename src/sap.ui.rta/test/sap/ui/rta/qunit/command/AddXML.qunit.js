/* global QUnit sinon */

QUnit.config.autostart = false;

sap.ui.require([
	'sap/ui/rta/command/CommandFactory',
	'sap/ui/fl/registry/ChangeRegistry',
	"sap/ui/dt/DesignTime",
	"sap/ui/dt/OverlayRegistry",
	'sap/ui/dt/ElementDesignTimeMetadata',
	'sap/ui/model/json/JSONModel',
	'sap/ui/fl/Utils',
	'sap/m/Button',
	'sap/m/Text',
	'sap/m/List',
	'sap/m/CustomListItem',
	'sap/ui/fl/changeHandler/AddXML',
	'sap/ui/rta/command/FlexCommand',
	'sap/ui/thirdparty/sinon',
	'sap/ui/thirdparty/sinon-ie',
	'sap/ui/thirdparty/sinon-qunit'
],
function (
	CommandFactory,
	ChangeRegistry,
	DesignTime,
	OverlayRegistry,
	ElementDesignTimeMetadata,
	JSONModel,
	Utils,
	Button,
	Text,
	List,
	CustomListItem,
	AddXML,
	FlexCommand
) {
	"use strict";
	QUnit.start();

	var oMockedAppComponent = {
		getLocalId: function () {
			return undefined;
		},
		getManifestEntry: function () {
			return {};
		},
		getMetadata: function () {
			return {
				getName: function () {
					return "someName";
				}
			};
		},
		getManifest: function () {
			return {
				"sap.app" : {
					applicationVersion : {
						version : "1.2.3"
					}
				}
			};
		},
		getModel: function () {},
		createId : function(sId) {
			return 'testcomponent---' + sId;
		}
	};
	var sandbox = sinon.sandbox.create();
	sinon.stub(Utils, "getAppComponentForControl").returns(oMockedAppComponent);

	QUnit.module("Given an AddXML command with a valid entry in the change registry,", {
		beforeEach : function(assert) {
			sandbox.stub(Utils, "getCurrentLayer").returns("VENDOR");
			this.oButton = new Button(oMockedAppComponent.createId("myButton"));
		},
		afterEach : function(assert) {
			this.oButton.destroy();
			sandbox.restore();
		}
	}, function() {
		QUnit.test("when getting an AddXML command for the change ...", function(assert) {
			var oApplyChangeStub = sandbox.stub(AddXML, "applyChange");
			var oCompleteChangeContentSpy = sandbox.spy(AddXML, "completeChangeContent");

			var oCommandFactory = new CommandFactory({
				flexSettings: {
					layer: "VENDOR"
				}
			});
			var oCommand = oCommandFactory.getCommandFor(this.oButton, "addXML", {
				fragmentPath: "pathToFragment",
				fragment: "fragment",
				targetAggregation: "targetAggregation",
				index: 0
			});
			assert.ok(oCommand, "then command without flex settings is available");
			assert.strictEqual(oCommand.getTargetAggregation(), "targetAggregation", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getFragmentPath(), "pathToFragment", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getFragment(), "fragment", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getIndex(), 0, "and its settings are merged correctly");

			oCommandFactory.setFlexSettings({
				layer: "VENDOR",
				developerMode: true
			});
			var oCommand2 = oCommandFactory.getCommandFor(this.oButton, "addXML", {
				fragmentPath: "pathToFragment",
				fragment: "fragment",
				targetAggregation : "targetAggregation",
				index: 0
			});
			assert.ok(oCommand2, "then command with flex settings is available");
			assert.strictEqual(oCommand.getTargetAggregation(), "targetAggregation", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getFragmentPath(), "pathToFragment", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getFragment(), "fragment", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getIndex(), 0, "and its settings are merged correctly");

			oCommandFactory.setFlexSettings({
				layer: "VENDOR",
				developerMode: false
			});

			assert.notOk(oCommand._oPreparedChange.getDefinition().content.fragment, "after preparing, the fragment content is not yet in the change");

			return oCommand.execute().then(function() {
				assert.equal(oCompleteChangeContentSpy.callCount, 2, "then completeChangeContent is called twice");
				assert.equal(oApplyChangeStub.callCount, 1, "then applyChange is called once");
				assert.notOk(oCommand._oPreparedChange.getDefinition().content.fragment, "after applying, the fragment content is not in the change anymore");
			});
		});

		//Undo is tested in change handler and generic Flex command logic

		QUnit.test("and design time metadata allows change on js only, when getting an AddXML command for the change ...", function(assert) {

			var oCommandFactory = new CommandFactory({
				flexSettings: {
					layer: "VENDOR",
					developerMode: true
				}
			});
			var oCommand = oCommandFactory.getCommandFor(this.oButton, "addXML", {
				fragmentPath: "pathToFragment",
				fragment: "fragment",
				targetAggregation: "targetAggregation",
				index: 0
			}, new ElementDesignTimeMetadata({
				data : {
					actions : {
						addXML : {
							jsOnly : true
						}
					}
				}
			}));

			var oChange = oCommand.getPreparedChange();

			assert.strictEqual(oChange.getDefinition().jsOnly, true, "then change is marked to be applied on js only");
		});
	});

	QUnit.module("Given an AddXML command for a bound control,", {
		beforeEach : function(assert) {
			var done = assert.async();

			sandbox.stub(Utils, "getCurrentLayer").returns("VENDOR");

			var aTexts = [{text: "Text 1"}, {text: "Text 2"}, {text: "Text 3"}];
			var oModel = new JSONModel({
				texts : aTexts
			});

			this.oItemTemplate = new CustomListItem("item", {
				content : new Text("text", {text : "{text}"})
			});
			this.oList = new List("list", {
				items : {
					path : "/texts",
					template : this.oItemTemplate
				}
			}).setModel(oModel);

			var oChangeRegistry = ChangeRegistry.getInstance();
			oChangeRegistry.removeRegistryItem({controlType : "sap.m.List"});
			oChangeRegistry.registerControlsForChanges({
				"sap.m.List" : {
					"addXML": "default"
				}
			});

			this.oDesignTime = new DesignTime({
				rootElements : [this.oList]
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				this.oListOverlay = OverlayRegistry.getOverlay(this.oList);
				done();
			}.bind(this));
		},
		afterEach : function(assert) {
			this.oList.destroy();
			this.oItemTemplate.destroy();
			this.oDesignTime.destroy();
			sandbox.restore();
		}
	}, function() {
		QUnit.test("when getting an AddXML command for the change ...", function(assert) {
			var oApplyChangeStub = sandbox.stub(AddXML, "applyChange");
			var oCompleteChangeContentSpy = sandbox.spy(AddXML, "completeChangeContent");

			var oCommandFactory = new CommandFactory({
				flexSettings: {
					layer: "VENDOR",
					developerMode: true
				}
			});
			var oCommand = oCommandFactory.getCommandFor(this.oList.getItems()[1], "addXML", {
				fragmentPath: "pathToFragment",
				fragment: "fragment",
				targetAggregation: "content",
				index: 0
			});
			assert.ok(oCommand, "then command is available");
			assert.strictEqual(oCommand.getTargetAggregation(), "content", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getFragmentPath(), "pathToFragment", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getFragment(), "fragment", "and its settings are merged correctly");
			assert.strictEqual(oCommand.getIndex(), 0, "and its settings are merged correctly");
			assert.strictEqual(oCommand.getPreparedChange().getSelector().id, this.oList.getId(), "and the prepared change contains the bound control as template selector");
			assert.strictEqual(oCommand.getPreparedChange().getDefinition().dependentSelector.originalSelector.id, "item", "and the prepared change contains the original selector as dependency");
			assert.strictEqual(oCommand.getPreparedChange().getContent().boundAggregation, "items", "and the bound aggegation is written to the change content");

			return oCommand.execute().then(function() {
				assert.equal(oCompleteChangeContentSpy.callCount, 1, "then completeChangeContent is called once");
				assert.equal(oApplyChangeStub.callCount, 1, "then applyChange is called once");
				assert.notOk(oCommand._oPreparedChange.getDefinition().content.fragment, "after applying, the fragment content is not in the change anymore");
			});
		});
	});
});