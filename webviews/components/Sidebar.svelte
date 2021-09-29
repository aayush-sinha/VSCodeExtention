<script lang="ts">
    let clickupToken = "";
    import { onMount } from "svelte";
    import type { User } from "../types";
    import Todos from "./Todos.svelte";

    let accessToken = "";
    let loading = true;
    let user: User | null = null;
    let page = tsvscode.getState()?.page || "todos";



    $: {
        tsvscode.setState({ page });
    }

    async function clickUpTokenSubmit(t: string) {
    //     const response = await fetch(`${apiBaseUrl}/clickup`, {
    //     method: 'PUT',
    //     body: JSON.stringify({
    //         clickUpId: t
    //     }),
    //     headers: {
    //         'content-type': 'application/json',
    //          authorization: `Bearer ${accessToken}`,
    //     }
    // });
    localStorage.setItem("clickupId", t);
    
    page = "todos"
}

    onMount(async () => {
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "token":
                    accessToken = message.value;
                    const response = await fetch(`${apiBaseUrl}/me`, {
                        headers: {
                            authorization: `Bearer ${accessToken}`,
                        },
                    });
                    const data = await response.json();
                    user = data.user;
                    // if (user?.clickUpId != null){
                    if (localStorage.getItem("clickupId")){
                        console.log("page======","todo",user?.clickUpId)
                        page = "todos"
                    } else {
                        console.log("page======","contact")
                        page = "contact"
                    }
                    loading = false;
            }
        });

        tsvscode.postMessage({ type: "get-token", value: undefined });
    });
</script>
<style>
.bottom_container{
    position: fixed;
    bottom: 0;
    display: flex;
    flex-wrap: wrap;

}
.bottom_container > button {
    margin-right: 10px;
    max-width: 100px;
    margin-bottom: 5px;
}
</style>
{#if loading}
    <div>loading...</div>
{:else if user}
    {#if page === 'todos'}
        <Todos {user} {accessToken} />
       
    {:else if page === 'contact'}
        <div>Please Enter Clickup Token Id:</div>
        <form
        on:submit|preventDefault={async () => {
        clickUpTokenSubmit(clickupToken);
        clickupToken = '';
        }}>
        <input bind:value={clickupToken} />
        </form>
        <button
            on:click={async () => {
                clickUpTokenSubmit(clickupToken);
                clickupToken = '';
                }}>Submit</button>
    {/if}
    <!-- <div class="bottom_container">
        <button
        on:click={() => {
            accessToken = '';
            user = null;
            tsvscode.postMessage({ type: 'logout', value: undefined });
        }}>logout</button>
         <button
         on:click={() => {
             page = 'contact';
         }}>Reset Token</button>
         <button
         on:click={() => {
             //TODO: Complete this function [Delete all added tast]
         }}>Reset Task</button>
    </div> -->
    
{:else}
    <button
        on:click={() => {
            tsvscode.postMessage({ type: 'authenticate', value: undefined });
        }}>login with GitHub</button>
{/if}
