# Handling Errors while installing the client

###  eslint incompatibility with typescript and react-scripts versions

If you face errors related to eslint version incompatibility with typescript and react-scripts,
try the following 

1. remove the following from the package.json

- eslint
- react-scripts
- typescript 

2. Then try running the following in order 

```sh
    npm install 
    ```

```sh
    npm install typescript@4.9.5 --save-dev
    ```

```sh
    npm install --legacy-peer-deps
    ```

```sh
    npm install react-scripts@latest --save
    ```

```sh
    npm install eslint@8 --save-dev
    ```

```sh
    npm install --legacy-peer-deps
    ```

```sh
    npx eslint --init 
    ```

Finally, try to run the client app again

```sh
    npm start
    ```