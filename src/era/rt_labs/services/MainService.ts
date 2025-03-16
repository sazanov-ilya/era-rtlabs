import { GlobalUtils, Converter } from "./../../utils";
import { Service } from "./../../platform/core";

class MainService extends Service {
    constructor() {
        super("rt_labs.MainService");
        
        // onCreateCode

        this.load();
    }

    async onInit() {
        await super.onInit();
        try {

            // onInitCode

        }
        catch (e) {
            this.log.exception("onInit", e);
        }
    }


    async onTimer() {
        await super.onTimer();
        try {

            // onTimerCode

        }
        catch (e) {
            this.log.exception("onTimer", e);
        }
    }


    // declarationsCode

    // functionsCode
}

export default MainService;