using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.Json;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Options
{
    public class GuidListConverter : JsonConverter<List<Guid>>
    {
        public override List<Guid> Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options)
        {
            var result = new List<Guid>();

            if (reader.TokenType == JsonTokenType.Null)
                return result;

            if (reader.TokenType != JsonTokenType.StartArray)
                throw new JsonException("Expected a JSON array for StudentIds.");

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndArray)
                    break;

                // Accept both real JSON strings and raw UUID tokens
                if (reader.TokenType == JsonTokenType.String)
                {
                    var raw = reader.GetString();
                    if (Guid.TryParse(raw, out var guid))
                        result.Add(guid);
                    // else: silently skip malformed entries
                }
                // Some serializers write GUIDs as plain values — handle that too
                else if (reader.TryGetGuid(out var directGuid))
                {
                    result.Add(directGuid);
                }
            }

            return result;
        }

        public override void Write(
            Utf8JsonWriter writer,
            List<Guid> value,
            JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            foreach (var g in value)
                writer.WriteStringValue(g);
            writer.WriteEndArray();
        }
    }
}
