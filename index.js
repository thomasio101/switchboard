const EventEmitter = require('events').EventEmitter

class Switchboard extends EventEmitter {
    constructor(config) {
        this.config = config
    }

    async send(queryName, ...parameters, successCallback, failureCallback) {
        if(this.config.hasOwnProperty(queryName)) {
            const [queryValidator, unProcessedQueryConfig] = this.config[queryName]

            async function processQueryConfig(unProcessedQueryConfig) {
                async function processQueryConfigEntry(value) {
                    switch(typeof value) {
                        case('object'):
                        return await processedQueryConfig(value)
                        case('function'):
                        return await value(...parameters)
                        default:
                        return value
                    }
                }

                if(!Array.isArray(unProcessedQueryConfig)) {
                    const processedQueryConfig = {}

                    for(const key in unProcessedQueryConfig) {
                        if(unProcessedQueryConfig.hasOwnProperty(key)) {
                            const value = unProcessedQueryConfig[key]
                            
                            processedQueryConfig[key] = await processQueryConfigEntry(value)
                        }
                    }

                    return processedQueryConfig
                } else return Promise.all(
                        unProcessedQueryConfig.map(
                            async entry => await processQueryConfigEntry(entry)
                        )
                    )
            }
            
            const processedQueryConfig = await processQueryConfig(unProcessedQueryConfig)

            const [valid, error] = await queryValidator(processQueryConfig, ...parameters)

            if(valid) this.emit(queryName, ...parameters, successCallback)
            else failureCallback(error)
        } else throw new NonExistentQueryError(queryName)
    }
}

class NonExistentQueryError extends Error {
    constructor(queryName) {
        super(`There is no query with the name "${queryName}".`)
    }
}