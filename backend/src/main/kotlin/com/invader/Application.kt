package com.invader

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.concurrent.CopyOnWriteArrayList

@Serializable
data class ScoreEntry(val playerName: String, val score: Int, val recordedAt: String = Instant.now().toString())

@Serializable
data class ScoreSubmission(val playerName: String, val score: Int)

object Leaderboard {
    private const val MAX_ENTRIES = 10
    private val entries = CopyOnWriteArrayList<ScoreEntry>()

    fun top(): List<ScoreEntry> = entries.sortedByDescending { it.score }.take(MAX_ENTRIES).toMutableList()

    fun submit(submission: ScoreSubmission): List<ScoreEntry> {
        val name = submission.playerName.trim().ifEmpty { "ANONYMOUS" }.take(12).uppercase()
        entries.add(ScoreEntry(playerName = name, score = submission.score.coerceAtLeast(0)))
        synchronized(this) {
            val sorted = entries.sortedByDescending { it.score }.take(MAX_ENTRIES)
            entries.clear()
            entries.addAll(sorted)
        }
        return top()
    }
}

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, host = "0.0.0.0", module = Application::module).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json()
    }
    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
    }

    routing {
        get("/api/health") {
            call.respond(mapOf("status" to "ok"))
        }

        get("/api/scores") {
            call.respond(Leaderboard.top())
        }

        post("/api/scores") {
            val submission = call.receive<ScoreSubmission>()
            call.respond(Leaderboard.submit(submission))
        }
    }
}
