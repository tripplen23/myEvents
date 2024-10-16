import { Events } from "../misc/events";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";


export const eventsApi = createApi({
   reducerPath: 'eventsApi',
   baseQuery: fetchBaseQuery({ baseUrl: `${import.meta.env.VITE_BASE_URL}/events`}),
   endpoints: (builder) => ({
      getEvents: builder.query<Events, void>({
         query: () => '/'
      })
   })
})

export const { useGetEventsQuery } = eventsApi;