class UPLCore {
	Context: PenguContext
	private _pluginRunnnerContext: any

	constructor(context: PenguContext) {
		this.Context = context
	}

	get pluginRunnnerContext(): any {
		return this._pluginRunnnerContext;
	}

	set pluginRunnnerContext(value: any) {
		this._pluginRunnnerContext = value;
	}
}
export let Core: UPLCore | undefined

export function initCore(context: PenguContext) {
	if (Core != undefined) {
		throw new Error("UPL is already initialized!")
	}

	Core = new UPLCore(context)
	context.rcp.preInit('rcp-fe-common-libs', async (api) => {
		Core!.pluginRunnnerContext = api
	})

}
