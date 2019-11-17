# Liquidity Index Bot

## Lambda Functions 
- takeScreenshot
- getData
- tweet

...which are orchestrated by AWS step function

## Test locally
```shell
sls invoke local -f takeScreenshot
```
```shell
sls invoke local -f getData 
```
```shell
sls invoke local -f tweet -d '{}'
```

## Deploy
```shell
sls deploy
```