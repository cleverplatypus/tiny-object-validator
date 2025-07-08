# Tiny Object Validator

![Tests](https://github.com/cleverplatypus/vue3-routable/actions/workflows/test.yml/badge.svg)

A small library to handle validation of an object's properties using field rules.

'Tiny' because it only concern itself with providing a mechanism to inspect and object and applying user defined rules rather than duplicating the effort of well established validation libraries such as [validator.js](https://www.npmjs.com/package/validator). 

Typically used in conjunction with the latter to do the actual data validation.

## Why I built this library
In a nutshell, I needed a pure JavaScript approach to data validation in Vue3, not relying on any logic held in view components or clunky HTML5 data validation.

## Installation

```
yarn add tiny-object-validator
```

or

```
npm i --save tiny-object-validator
```

## Getting Started

Let's say we have a model object populated  by our UI for user registration:


```typescript
const model = {
    email : 'test@example',
    password : '123456',
    acceptConditions : false
}
```

The validation result will be stored in a `ValidationState` object that we'll need to pass to `validate`.

```typescript
const stateObj: ValidationState = {
    isValid : false,
    fields : {}
}
```



The `false` value for each field is the validation initial state which means that the field hasn't been validated (yet).

Then, we define the rules:

```typescript
const fields : ValidationFields = [
    {
        name : 'email',
        emptyFieldMessage : 'Your email address is required'
        tests : [
            {
                fn : isEmail //using validator.js' on isEmail function
                message : ({source}) =>  `${source.email} doesn't seem to be a valid email`
            }
        ]
    }, {
        name : 'password',
        tests : [
            {
                fn : value =>  !['123456', 'password'].includes(value),
                message : 'Seriously?!?'
            }, {
                fn : value => value.length >= 8,
                message : 'The password needs to be at least 8 characters long'
            }
        ],
        stopOnFailure : 'tests'// the first test to fail will stop tests evaluation and set the field's failure message
    }, {
        name : 'acceptConditions',
        tests : [
            {
                fn : value => !!value,
                message : 'Please accept term and conditions'
            }
        ]
    }
]
```

Finally, we can validate our data.
The `ObjectValidator` only needs to be instanciated once. Our app will call the `validate` method whenever appropriate, either on form input or form submit.

```typescript
const validator = new ObjectValidator(fields);

const valid = await validator.validate({source : model, stateObj});

```

`stateObj` will be mutated atomically at the end of the validation and it will look like this:

```typescript
{
    isValid : false,
    fields : {
        email : '"test@example" doesn\'t seem to be a valid email',
        password : 'Are you serious?!?',
        acceptConditions : true
    }
}
```

---
## `stateObj : ValidationState`

This object, passed to `validate`, gets populated with the validation result.

`isValid` will be set to true if validation succedes
`fields` will be filled with all the source data object properties paths to be validated

The value for each `fields` entry will be:
- `false` if the field wasn't validated
- `true` if the field passed validation
- a string with the validation failure description

Deep fields can be declared using dot notation, such as `address.postal_code`

### Note for Vue3 developers

If we're relying on Vue3 reactivity for the UI to see `stateObj` to give feedback to the client,  the `fields` property must be populated like this:

```typescript
const stateObj: ValidationState = {
    isValid : false,
    fields : {
        email : false,
        password : false,
        acceptConditions : true
    }
}
```

## The context object
An optional object/array can be passed to `validate` to provide additional data/functions to the validation process.  

A context object (`ValidationContext`) will be passed to:
- tests' `fn` and `message` when the latter is a function
- fields' `skipIf`
- fields' `emptyFieldMessage` when it's a function

This could be used to provide additional information/functionality when processing validation. 

For instance, it can be used when a field depends on other field's value for validation. 


```typescript
const data = {
    locale : 'US',
    postal_code : '12345'
}

const fields = [
    {
        name : 'locale',
        tests : [
            {
                fn : value => ['US', 'AU', 'UK', 'CA'].includes(value)
                emptyFieldMessage : 'Please select a country'
            }
        ]
    }, {
        name : 'postal_code',
        skipIf : ({source}) => !source.locale,
        tests : [
            {
                fn : (value, {source}) => isPostalCode(value, source.locale),
                message : `This doesn't seem like a postal code for the selected country`
            }
        ]
    }
]


validator.validate({
    source : myData,
    stateObj
});

```

## Interrupting validation

It's possible to prematurely interrupt validation at two levels: 
- `tests` the currently evaluated array of tests for a field will stop and the latest validation result for the field will be used
- `fields` the whole validation will terminate after setting the current field's validation result. 

This is handled at field's level using `stopOnSuccess` (which makes tests behave in a `or` fashion) or `stopOnFailure` (which makes tests behave in a `and` fashion).

```typescript

const fields = [
    {
        name : 'ip_address',
        tests : [
            {
                fn : isIP4
            }, {
                fn : isIP6,
                message : 'Please enter either a IPv4 or a IPv6 address'
            }
        ],
        stopOnSuccess : 'tests'
    }
]
```
 
## Validation errors

The library treats empty fields and failed tests differently.

Empty fields are evaluated using the an `EmptyFieldTest` function that can be customised at the validator instance level using `ObjectValidator.setDefaultEmptyFieldTest()`.

The default `EmptyFieldTest` function is:
```typescript
const DEFAULT_EMPTY_FIELD_TEST : EmptyFieldTest = (data, context) =>
  typeof data !== "number" && (data === false || !data?.length); 
```
which this covers required true, null, undefined, '' and empty array.


### Setting messaging

The library provides a default error message for mandatory fields and failed fields that can be customised.

The finer grain level of customisation is at the field level using `emptyFieldMessage` and `message`.

```typescript
const fields = [
    {
        name : 'country',
        tests : [
            {
                fn : (value) => ['US', 'AU', 'UK', 'CA'].includes(value),
                message : 'Please select a valid country'
            }
        ],
        emptyFieldMessage : 'Please select a country',
    }
]
```

### Dynamic error messages

The `message` property can be a function that receives a `ValidationContext` object as parameter.

```typescript
const fields = [
    {
        name : 'country',
        tests : [
            {
                fn : (value) => ['US', 'AU', 'UK', 'CA'].includes(value),
                message : ({source}) => `"${source.country}" is not a valid country`
            }
        ],
        emptyFieldMessage : 'Please select a country',
    }
]
```

### Default error messages

It's possible to set default error messages for mandatory fields and failed fields.

Error message resolution follows this order:

- global level using `ObjectValidator.setDefaultMandatoryFieldError` and `ObjectValidator.setDefaultFailedFieldMessage`.
- instance level using `withMandatoryFieldError` and `withFailedFieldDefaultError`.
- field level using `emptyFieldMessage` and `message`.
