# Kubernetes run

## Building the Docker image
```
docker buildx build --platform linux/amd64 --tag fixgen:latest --load .

docker tag fixgen:latest 690616407375.dkr.ecr.us-east-1.amazonaws.com/test/ch-test-delete:latest
docker push 690616407375.dkr.ecr.us-east-1.amazonaws.com/test/ch-test-delete:latest
```

## Configuring
```
kubectl apply -n workflows -f configmap.yaml
```

## Running
```
kubectl apply -n workflows -f replicaset.yaml
```

## Deleting
```
kubectl delete replicaset -n workflows fixgen
kubectl delete configmap -n workflows fixgen
```