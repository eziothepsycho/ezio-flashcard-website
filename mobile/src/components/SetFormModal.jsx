import { useState } from "react";

import { describeError } from "../lib/api/client.js";
import Button from "./Button";
import Field from "./Field";
import FormSheet from "./FormSheet";
import Notice from "./Notice";

// Create or rename a set. The API is the authority on titles (it trims and
// rejects blanks with error.fields.title), so the message it sends is shown
// under the field rather than a second rule being invented here.
export default function SetFormModal({ mode, initialSet, onCancel, onSubmit }) {
  const editing = mode === "edit";
  const [title, setTitle] = useState(initialSet?.title ?? "");
  const [description, setDescription] = useState(initialSet?.description ?? "");
  const [titleError, setTitleError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    setTitleError("");
    setFormError("");

    if (!title.trim()) {
      setTitleError("Give the set a title.");
      return;
    }

    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() });
    } catch (err) {
      setTitleError(err?.fields?.title ?? "");
      setFormError(describeError(err, "set"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormSheet
      onClose={busy ? () => {} : onCancel}
      title={editing ? "Edit set" : "New set"}
      footer={
        <>
          {Boolean(formError) && <Notice>{formError}</Notice>}
          <Button busy={busy} onPress={handleSubmit} title={editing ? "Save changes" : "Create set"} />
          <Button disabled={busy} onPress={onCancel} title="Cancel" variant="ghost" />
        </>
      }
    >
      <Field
        autoCapitalize="sentences"
        error={titleError}
        label="Title"
        onChangeText={setTitle}
        placeholder="Networking Fundamentals"
        value={title}
      />
      <Field
        autoCapitalize="sentences"
        label="Description (optional)"
        multiline
        onChangeText={setDescription}
        value={description}
      />
    </FormSheet>
  );
}
