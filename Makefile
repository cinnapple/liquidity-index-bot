IMAGE := cinnapple/liquidity-index-bot

build-image:
	docker build . -t $(IMAGE)

push-image:
	docker image push $(IMAGE)