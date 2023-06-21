IMAGE_TAG ?= latest
IMAGE := assistant:$(IMAGE_TAG)


build:
	docker build -t $(IMAGE) .

run:
	docker run -it --rm  -v $(PWD):/app $(IMAGE) run dev

shell:
	docker run -it --rm --env-file=.env -v "$(PWD)":/app --entrypoint /bin/bash $(IMAGE)
