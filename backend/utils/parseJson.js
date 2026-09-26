const parseJSON = (value, fieldName) =>{
    try{
        return JSON.parse(value)
    }catch(error){
        const parseError = new Error(`Invalid JSON provided for ${fieldName}.`)
        parseError.statusCode = 400
        throw parseError
    }
}

module.exports = parseJSON