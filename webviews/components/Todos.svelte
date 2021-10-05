<script lang="ts">
    import { onMount } from "svelte";
    import type { User } from "../types";
    import Select from 'svelte-select';
    export let user: User;
    export let accessToken: string;
    let text = "";
    let todos: Array<{ text: string; completed: boolean; id: number; status: string }> = [];
    function list(id: number){
        return [
	{value: 'o', label: 'Open' , id},
    {value: 'ip', label: 'In Progress' , id},
    {value: 'ba', label: 'Build Available', id},
	]
    }
    
	let items = [
	{value: 'o', label: 'Open'},
    {value: 'ip', label: 'In Progress'},
    {value: 'ba', label: 'Build Available'},
	];
	
	let status ;
	
	async function handleSelect(event: { detail: any; }) {
        console.log("----------in", event.detail)
        console.log('---token---',localStorage.getItem("clickupId"))
        const response = await fetch(`${apiBaseUrl}/todo`, {
            method: "PUT",
            body: JSON.stringify({
                id: event.detail.id ,
                status: event.detail.label,
                clickupId: localStorage.getItem("clickupId")
            }),
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${accessToken}`,
            },
        });
	
	}
	
    async function addTodo(t: string) {
        console.log("add-todo called")
        const response = await fetch(`${apiBaseUrl}/todo`, {
            method: "POST",
            body: JSON.stringify({
                text: t,
                clickupId: localStorage.getItem("clickupId")
            }),
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${accessToken}`,
            },
        });
        const { todo } = await response.json();
        todos = [todo, ...todos];
    }

      async function updateTodo(id: number, status: any) {
        const response = await fetch(`${apiBaseUrl}/todo`, {
            method: "PUT",
            body: JSON.stringify({
                id,
                status,
                clickupId: localStorage.getItem("clickupId")
            }),
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${accessToken}`,
            },
        });
    }

    onMount(async () => {
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "new-todo":
                    addTodo(message.value);
                    break;
            }
        });

        const response = await fetch(`${apiBaseUrl}/todo`, {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        });
        const payload = await response.json();
        todos = payload.todos;
        console.log(todos)
    });
    
</script>

<style>
    .complete {
        text-decoration: line-through;
    }
    .flex_center {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    button{
        /* max-width: 300px; */
        margin-top: 10px;
    }
    form {
        width: 100%;
    }
    .card_container{
        display: flex;
        flex-direction: column;
    }
    .card{
        margin-top: 20px;
        border: 1px solid #0e639c;
        padding: 5px 5px 15px 5px;
    }
    .card_header{
        display: flex;
        justify-content: space-between;
    }
    .card_body{
        margin-top: 15px;
    }
    .themed {
    --borderRadius: 0px;
    --height: 30px;
    color: #81b1ff;
    --background-color: #3c3c3c;
    }

</style>

<div>Enter Ticket ID:</div>
<div class="flex_center">
<form
    on:submit|preventDefault={async () => {
        addTodo(text);
        text = '';
    }}>
    <input bind:value={text} placeholder="ticket id" />
</form>
    <button on:click={async () => {
        addTodo(text);
        text = '';
    }}>
        Submit
    </button>
</div>
<div class="card_container">
    {#each todos as todo (todo.id)}
        <div class="card">
            <div class="card_header"><h4
            class:complete={todo.completed}
            on:click={async () => {
                todo.completed = !todo.completed;
                const response = await fetch(`${apiBaseUrl}/todo`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        id: todo.id,
                    }),
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${accessToken}`,
                    },
                });
                console.log(await response.json());
            }}>
            {todo.text}
        </h4><img src="https://api.iconify.design/clarity/window-close-line.svg?color=%23ccc" alt="" 
                on:click={() => {
                 //TODO: Complete this function [Delete particular task]
                }}/>
        </div>
        <div class="card_body">
            <div class="themed">
             {#if todo.status === "in progress"}
             {items = list(todo.id)}
            <Select {items} id="food"  value={items[1]} on:select={handleSelect}   isClearable={false} ></Select>
            {:else if todo.status === "open"}
            {items = list(todo.id)}
            <Select  id="food" {items} value={items[0]} on:select={handleSelect}  isClearable={false} ></Select>
            {:else if todo.status === "build available"}
            {items = list(todo.id)}
            <Select  id="food" {items} value={items[2]} on:select={handleSelect}  isClearable={false} ></Select>
            {/if}
            
        </div>
        </div>
       
        </div>
    {/each}
</div>
