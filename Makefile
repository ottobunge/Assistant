IMAGE_TAG ?= latest
IMAGE := assistant:$(IMAGE_TAG)


build:
	docker build -t $(IMAGE) .

run:
	docker run -it --net=host --rm  -v $(PWD):/app $(IMAGE) --entrypoint npx bun src/index.ts

shell:
	docker run -it --rm --net=host --env-file=.env -v "$(PWD)":/app --entrypoint /bin/bash $(IMAGE)
