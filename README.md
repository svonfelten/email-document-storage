# Description

This script uses a email adress and each email with attachment that you send will be saved at the specified path in the subject. 

For  example with the subject BIlls/car and 2 attachments it will save the attaachments in the <specifiedConfigPath</Bills/Car.

As you can see the names are normalized to not be case sensitive. In the future maybe add a function to check and find the nearest folder and put it in.

## usage 

### build

```
npm run build
```

### run
```
npm run start
```

## configuration 

this is some example configuration for gmail adress.
To use gmail you must create a App Password you can't use your account password. see [here](https://support.google.com/accounts/answer/185833?hl=en) for more infos.
```
{
    "user": "user@gmail.com",
    "password": "SuperStrongPassword%",
    "host": "imap.gmail.com",
    "port": 993,
    "tls": true,
    "tlsOptions": { "rejectUnauthorized": false },
    "authTimeout": 3000
  }
```
