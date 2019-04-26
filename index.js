const EventEmitter = require('events').EventEmitter

class Switchboard extends EventEmitter {
    constructor(config) {
        super()

        this.config = config
    }

    async send(queryName, successCallback, failureCallback, ...parameters) {
        if(this.config.hasOwnProperty(queryName)) {
            const [queryValidators, unProcessedQueryConfig] = this.config[queryName]

            async function processQueryConfig(unProcessedQueryConfig) {
                async function processQueryConfigEntry(value) {
                    switch(typeof value) {
                        case('object'):
                        return await processQueryConfig(value)
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
                } else return await Promise.all(
                        unProcessedQueryConfig.map(
                            async entry => await processQueryConfigEntry(entry)
                        )
                    )
            }
            
            const processedQueryConfig = await processQueryConfig(unProcessedQueryConfig)
            
            if(Array.isArray(queryValidators)) {
                const validatorResults = await Promise.all(queryValidators.map(queryValidator => queryValidator(processedQueryConfig, ...parameters)))

                let allValid = true

                for(const [valid, error] of validatorResults)
                    if(!valid) {
                        allValid = false
                        failureCallback(error)
                        break
                    }

                if(allValid) this.emit(queryName, successCallback, ...parameters)
            } else {
                const queryValidator = queryValidators

                const [valid, error] = await queryValidator(processedQueryConfig, ...parameters)

                if(valid) this.emit(queryName, successCallback, ...parameters)
                else failureCallback(error)
            }
        } else throw new NonExistentQueryError(queryName)
    }
}

class NonExistentQueryError extends Error {
    constructor(queryName) {
        super(`There is no query with the name "${queryName}".`)
    }
}

module.exports = Switchboard