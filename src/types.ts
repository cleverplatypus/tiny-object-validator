export type ValidationState = {
    isValid : boolean
    fields : FieldsState
}

export type StopPolicy = 'fields' | 'tests'

export type FieldState = boolean | string
export type FieldsState = { [key : string] : FieldState }

export type ValidationMessage = string | ((context : ValidationContext) => string)

export type ValidationSettings = {
    source : any
    stateObj : ValidationState
    contextData? : Object | Array<any>
}

export type ValidationContext = {
    currentFieldName : string
    source : any;
    contextData? : any;
}

export type ValidationFields = Array<ValidationField>

export type ValidationField = {
    name : string 
    isOptional? : boolean
    tests? : ValidationTest[]
    fields? : ValidationFields
    emptyTest? : (value : any, context : ValidationContext) => boolean
    emptyFieldMessage? : ValidationMessage
    skipIf? : (context : ValidationContext) => boolean
    stopOnFailure? : StopPolicy
    stopOnSuccess? : StopPolicy
}

export type EmptyFieldTest = (value : any, context : ValidationContext) => boolean

export type ValidationTest = {
    fn : (value : any, context : ValidationContext) => boolean | string
    message? : string | ((context : ValidationContext) => string)
}