# Liquidity Index Bot

[Liquidity Index Bot](https://twitter.com/LiquidityB)

## Run

Create a new `.env` file by copying the `.env-sample`. Modify the variables with your own Twitter API tokens
```
# when set to true the bot will send a tweet using the API keys specified below
tweet=false
consumer_key="XXX"
consumer_secret="YYY"
access_token_key="ZZZ"
access_token_secret="SSS"
```

Run 
```
docker-compose -f docker-compose-dev.yml up
```