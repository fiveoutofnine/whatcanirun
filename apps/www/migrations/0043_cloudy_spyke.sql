DROP MATERIALIZED VIEW "public"."view__model_device_summary";--> statement-breakpoint
DROP MATERIALIZED VIEW "public"."view__model_stats_by_device";--> statement-breakpoint
DROP INDEX "devices_dedup_idx";--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "gpu_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "devices_dedup_idx" ON "devices" USING btree ("cpu","cpu_cores","gpu","gpu_cores","gpu_count","ram_gb","os_name","os_version");--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."view__model_device_summary" AS (select "models"."id" as "model_id", MIN("models_info"."family_id") as "family_id", "devices"."chip_id", MIN("devices"."cpu") as "device_cpu", MIN("devices"."cpu_cores") as "device_cpu_cores", MIN("devices"."gpu") as "device_gpu", MIN("devices"."gpu_cores") as "device_gpu_cores", MIN("devices"."gpu_count") as "device_gpu_count", MIN("devices"."ram_gb") as "device_ram_gb", AVG("trials"."decode_tps") as "avg_decode_tps", AVG("trials"."prefill_tps") as "avg_prefill_tps", (
          CASE
          WHEN AVG(
            CASE WHEN NOT ("runs"."runtime_name" = 'llama.cpp' AND "runs"."harness_version" <= '0.1.16')
              AND NOT (LOWER("devices"."os_name") != 'macos' AND "runs"."harness_version" < '0.1.19')
              THEN "trials"."peak_rss_mb"
            END
          ) IS NOT NULL THEN
            0.45 * (CASE
              WHEN AVG("trials"."decode_tps") >= 100 THEN 1.0
              WHEN AVG("trials"."decode_tps") >= 40  THEN 0.8 + 0.2 * (AVG("trials"."decode_tps") - 40) / 60.0
              WHEN AVG("trials"."decode_tps") >= 20  THEN 0.6 + 0.2 * (AVG("trials"."decode_tps") - 20) / 20.0
              WHEN AVG("trials"."decode_tps") >= 10  THEN 0.4 + 0.2 * (AVG("trials"."decode_tps") - 10) / 10.0
              WHEN AVG("trials"."decode_tps") >= 5   THEN 0.2 + 0.2 * (AVG("trials"."decode_tps") - 5) / 5.0
              ELSE 0.2 * AVG("trials"."decode_tps") / 5.0
            END)
            + 0.25 * (CASE
              WHEN AVG("trials"."prefill_tps") >= 4000 THEN 1.0
              WHEN AVG("trials"."prefill_tps") >= 2000 THEN 0.8 + 0.2 * (AVG("trials"."prefill_tps") - 2000) / 2000.0
              WHEN AVG("trials"."prefill_tps") >= 1000 THEN 0.6 + 0.2 * (AVG("trials"."prefill_tps") - 1000) / 1000.0
              WHEN AVG("trials"."prefill_tps") >= 500  THEN 0.4 + 0.2 * (AVG("trials"."prefill_tps") - 500) / 500.0
              WHEN AVG("trials"."prefill_tps") >= 200  THEN 0.2 + 0.2 * (AVG("trials"."prefill_tps") - 200) / 300.0
              ELSE 0.2 * AVG("trials"."prefill_tps") / 200.0
            END)
            + 0.30 * GREATEST(0, 1.0 - COALESCE(
                AVG(CASE WHEN NOT ("runs"."runtime_name" = 'llama.cpp' AND "runs"."harness_version" <= '0.1.16')
                  AND NOT (LOWER("devices"."os_name") != 'macos' AND "runs"."harness_version" < '0.1.19')
                  THEN "trials"."peak_rss_mb"
                END),
                COALESCE(NULLIF(MIN("models_info"."file_size_bytes"), 0), "models"."file_size_bytes")
                  / (1024.0 * 1024.0) + 512.0
              ) / (MIN("devices"."ram_gb") * 716.8))
          ELSE
            0.65 * (CASE
              WHEN AVG("trials"."decode_tps") >= 100 THEN 1.0
              WHEN AVG("trials"."decode_tps") >= 40  THEN 0.8 + 0.2 * (AVG("trials"."decode_tps") - 40) / 60.0
              WHEN AVG("trials"."decode_tps") >= 20  THEN 0.6 + 0.2 * (AVG("trials"."decode_tps") - 20) / 20.0
              WHEN AVG("trials"."decode_tps") >= 10  THEN 0.4 + 0.2 * (AVG("trials"."decode_tps") - 10) / 10.0
              WHEN AVG("trials"."decode_tps") >= 5   THEN 0.2 + 0.2 * (AVG("trials"."decode_tps") - 5) / 5.0
              ELSE 0.2 * AVG("trials"."decode_tps") / 5.0
            END)
            + 0.35 * (CASE
              WHEN AVG("trials"."prefill_tps") >= 4000 THEN 1.0
              WHEN AVG("trials"."prefill_tps") >= 2000 THEN 0.8 + 0.2 * (AVG("trials"."prefill_tps") - 2000) / 2000.0
              WHEN AVG("trials"."prefill_tps") >= 1000 THEN 0.6 + 0.2 * (AVG("trials"."prefill_tps") - 1000) / 1000.0
              WHEN AVG("trials"."prefill_tps") >= 500  THEN 0.4 + 0.2 * (AVG("trials"."prefill_tps") - 500) / 500.0
              WHEN AVG("trials"."prefill_tps") >= 200  THEN 0.2 + 0.2 * (AVG("trials"."prefill_tps") - 200) / 300.0
              ELSE 0.2 * AVG("trials"."prefill_tps") / 200.0
            END)
          END
        ) as "composite_score" from "trials" inner join "runs" on "trials"."run_id" = "runs"."id" inner join "models" on "runs"."model_id" = "models"."id" inner join "devices" on "runs"."device_id" = "devices"."id" left join "models_info" on "models"."artifact_sha256" = "models_info"."artifact_sha256" where ("runs"."status" = 'verified' and "trials"."input_tokens" = 4096 and "trials"."output_tokens" = 1024) group by "models"."id", "devices"."chip_id");--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."view__model_stats_by_device" AS (select "models"."id" as "model_id", COALESCE(NULLIF(MIN("models_info"."name"), ''), "models"."display_name") as "model_display_name", "models"."format", COALESCE(NULLIF(MIN("models_info"."file_size_bytes"), 0), "models"."file_size_bytes") as "model_file_size_bytes", COALESCE(NULLIF(MIN("models_info"."parameters"), ''), "models"."parameters") as "model_parameters", COALESCE(NULLIF(MIN("models_info"."quant"), ''), "models"."quant") as "model_quant", COALESCE(NULLIF(MIN("models_info"."architecture"), ''), "models"."architecture") as "model_architecture", COALESCE(NULLIF(MIN("models_info"."source"), ''), "models"."source") as "model_source", MIN("lab_org"."name") as "lab_name", MIN("lab_org"."logo_url") as "lab_logo_url", MIN("lab_org"."website_url") as "lab_website_url", MIN("lab_org"."slug") as "lab_slug", MIN("model_families"."slug") as "family_slug", MIN("quant_org"."name") as "quantized_by_name", MIN("quant_org"."logo_url") as "quantized_by_logo_url", MIN("quant_org"."website_url") as "quantized_by_website_url", "devices"."chip_id", MIN("devices"."cpu") as "device_cpu", MIN("devices"."cpu_cores") as "device_cpu_cores", MIN("devices"."gpu") as "device_gpu", MIN("devices"."gpu_cores") as "device_gpu_cores", MIN("devices"."gpu_count") as "device_gpu_count", MIN("devices"."ram_gb") as "device_ram_gb", "runs"."runtime_name", count(distinct "runs"."id") as "run_count", count("trials"."id") as "trial_count", PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "trials"."ttft_ms") as "ttft_p50_ms", PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "trials"."ttft_ms") as "ttft_p95_ms", AVG("trials"."decode_tps") as "avg_decode_tps", AVG("trials"."prefill_tps") as "avg_prefill_tps", 
          COALESCE(AVG(
            CASE WHEN NOT ("runs"."runtime_name" = 'llama.cpp' AND "runs"."harness_version" <= '0.1.16')
              AND NOT (LOWER("devices"."os_name") != 'macos' AND "runs"."harness_version" < '0.1.19')
              THEN "trials"."idle_rss_mb"
            END
          ), 0)
         as "avg_idle_rss_mb", 
          COALESCE(AVG(
            CASE WHEN NOT ("runs"."runtime_name" = 'llama.cpp' AND "runs"."harness_version" <= '0.1.16')
              AND NOT (LOWER("devices"."os_name") != 'macos' AND "runs"."harness_version" < '0.1.19')
              THEN "trials"."peak_rss_mb"
            END
          ), 0)
         as "avg_peak_rss_mb", (
          CASE
          -- When reliable memory data exists, use full formula (decode + prefill + memory)
          WHEN AVG(
            CASE WHEN NOT ("runs"."runtime_name" = 'llama.cpp' AND "runs"."harness_version" <= '0.1.16')
              AND NOT (LOWER("devices"."os_name") != 'macos' AND "runs"."harness_version" < '0.1.19')
              THEN "trials"."peak_rss_mb"
            END
          ) IS NOT NULL THEN
            0.45 * (CASE
              WHEN AVG("trials"."decode_tps") >= 100 THEN 1.0
              WHEN AVG("trials"."decode_tps") >= 40  THEN 0.8 + 0.2 * (AVG("trials"."decode_tps") - 40) / 60.0
              WHEN AVG("trials"."decode_tps") >= 20  THEN 0.6 + 0.2 * (AVG("trials"."decode_tps") - 20) / 20.0
              WHEN AVG("trials"."decode_tps") >= 10  THEN 0.4 + 0.2 * (AVG("trials"."decode_tps") - 10) / 10.0
              WHEN AVG("trials"."decode_tps") >= 5   THEN 0.2 + 0.2 * (AVG("trials"."decode_tps") - 5) / 5.0
              ELSE 0.2 * AVG("trials"."decode_tps") / 5.0
            END)
            + 0.25 * (CASE
              WHEN AVG("trials"."prefill_tps") >= 4000 THEN 1.0
              WHEN AVG("trials"."prefill_tps") >= 2000 THEN 0.8 + 0.2 * (AVG("trials"."prefill_tps") - 2000) / 2000.0
              WHEN AVG("trials"."prefill_tps") >= 1000 THEN 0.6 + 0.2 * (AVG("trials"."prefill_tps") - 1000) / 1000.0
              WHEN AVG("trials"."prefill_tps") >= 500  THEN 0.4 + 0.2 * (AVG("trials"."prefill_tps") - 500) / 500.0
              WHEN AVG("trials"."prefill_tps") >= 200  THEN 0.2 + 0.2 * (AVG("trials"."prefill_tps") - 200) / 300.0
              ELSE 0.2 * AVG("trials"."prefill_tps") / 200.0
            END)
            -- 716.8 = 0.7 * 1024: only ~70% of device RAM is usable headroom
            -- Peak RSS falls back to file-size estimate when bugged readings are excluded
            + 0.30 * GREATEST(0, 1.0 - COALESCE(
                AVG(CASE WHEN NOT ("runs"."runtime_name" = 'llama.cpp' AND "runs"."harness_version" <= '0.1.16')
                  AND NOT (LOWER("devices"."os_name") != 'macos' AND "runs"."harness_version" < '0.1.19')
                  THEN "trials"."peak_rss_mb"
                END),
                COALESCE(NULLIF(MIN("models_info"."file_size_bytes"), 0), "models"."file_size_bytes")
                  / (1024.0 * 1024.0) + 512.0
              ) / (MIN("devices"."ram_gb") * 716.8))
          -- No reliable memory data (non-macOS < 0.1.19): score on speed only
          ELSE
            0.65 * (CASE
              WHEN AVG("trials"."decode_tps") >= 100 THEN 1.0
              WHEN AVG("trials"."decode_tps") >= 40  THEN 0.8 + 0.2 * (AVG("trials"."decode_tps") - 40) / 60.0
              WHEN AVG("trials"."decode_tps") >= 20  THEN 0.6 + 0.2 * (AVG("trials"."decode_tps") - 20) / 20.0
              WHEN AVG("trials"."decode_tps") >= 10  THEN 0.4 + 0.2 * (AVG("trials"."decode_tps") - 10) / 10.0
              WHEN AVG("trials"."decode_tps") >= 5   THEN 0.2 + 0.2 * (AVG("trials"."decode_tps") - 5) / 5.0
              ELSE 0.2 * AVG("trials"."decode_tps") / 5.0
            END)
            + 0.35 * (CASE
              WHEN AVG("trials"."prefill_tps") >= 4000 THEN 1.0
              WHEN AVG("trials"."prefill_tps") >= 2000 THEN 0.8 + 0.2 * (AVG("trials"."prefill_tps") - 2000) / 2000.0
              WHEN AVG("trials"."prefill_tps") >= 1000 THEN 0.6 + 0.2 * (AVG("trials"."prefill_tps") - 1000) / 1000.0
              WHEN AVG("trials"."prefill_tps") >= 500  THEN 0.4 + 0.2 * (AVG("trials"."prefill_tps") - 500) / 500.0
              WHEN AVG("trials"."prefill_tps") >= 200  THEN 0.2 + 0.2 * (AVG("trials"."prefill_tps") - 200) / 300.0
              ELSE 0.2 * AVG("trials"."prefill_tps") / 200.0
            END)
          END
        ) as "composite_score" from "trials" inner join "runs" on "trials"."run_id" = "runs"."id" inner join "models" on "runs"."model_id" = "models"."id" inner join "devices" on "runs"."device_id" = "devices"."id" left join "models_info" on "models"."artifact_sha256" = "models_info"."artifact_sha256" left join "organizations" "lab_org" on "models_info"."lab_id" = "lab_org"."id" left join "organizations" "quant_org" on "models_info"."quantized_by_id" = "quant_org"."id" left join "model_families" on "models_info"."family_id" = "model_families"."id" where ("runs"."status" = 'verified' and "trials"."input_tokens" = 4096 and "trials"."output_tokens" = 1024) group by "models"."id", "devices"."chip_id", "runs"."runtime_name");